require('dotenv').config()

import * as Sentry from '@sentry/bun'
Sentry.init({
	dsn: 'https://57ec3f517feb493da066bf93f56af32b@app.glitchtip.com/5897',
	tracesSampleRate: 1.0
})

const { Telegraf, session } = require('telegraf')
const { Telegram } = require('telegraf')
const { genSecureRandom } = require('./auth.js')
const { pb } = require('./db.js')

const { BOT_KEY, WEBAPP_URL } = process.env
const bot = new Telegraf(BOT_KEY)

bot.use(async (ctx, next) => {
	return next()

	// if (ctx.message.new_chat_members) {
	//  const newMembers = ctx.message.new_chat_members;
	//  for (let member of newMembers) {
	//    const chat = await ctx.getChat();
	//    console.log(`Invite link used: ${chat.invite_link}`);
	//  }
	// }
	// return next();
});

bot.command('myid', ctx => {
	ctx.reply(`your id is: ${ctx.from.id}`)
})

console.log('--- starting bot ----')
bot.start(async ctx => {
	try {
		const { id, is_bot, username, first_name, last_name } = ctx.from
		if (is_bot) return ctx.reply('bots not alowed')

		// ctx.reply(`Deep link payload: ${ctx.payload}`)

		const user = {
			userID: id,
			userName: username,
			firstName: first_name,
			lastName: last_name
		}
		// const userJSON = JSON.stringify(user)
		// const encrypted = await encrypt(userJSON)
		// ctx.session.data = encrypted

		await ctx.reply(`Ready for the magic? Press 'ENTER' below 🔽`)
		await ctx.reply(`${WEBAPP_URL}`)

		await ctx.setChatMenuButton({
			text: "ENTER",
			type: "web_app",
			web_app: {
				url: `${WEBAPP_URL}`,
			},
		})
	} catch (err) {
		Sentry.captureException(err)
	}
})

const isOwner = async ctx => {
	try {
		const chatID = ctx.chat.id
		const userID = ctx.from.id
		const { status } = await bot.telegram.getChatMember(chatID, userID)

		if (status === 'creator') return true
		return false
	} catch (error) {
		Sentry.captureException(error)
		return false
	}
}

bot.command('test', (ctx) => {
	if (ctx.chat.type !== 'private') {
		ctx.reply(`Group ID: ${ctx.chat.id}, Group Title: ${ctx.chat.title}`);
	}
});

bot.command('verifyOG', async ctx => {
	const { command, payload, message } = ctx
	if (command === 'verifyOG' && payload) {
		try {
			const telegramID = ctx.from.id
			if (ctx.chat.id > 0) return ctx.reply('works only in groups', { reply_to_message_id: message.message_id })
			if (!await isOwner(ctx)) return ctx.reply('only owners are allowed!', { reply_to_message_id: message.message_id })

			console.log(telegramID)

			const { id: userDbID, toProve, ogGroupName, ogGroupID, ogGroupProof } = await pb.collection('Users').getFirstListItem(`telegramID="${telegramID}"`)


			if (ogGroupName || ogGroupID || ogGroupProof) return ctx.reply('you already verified OG group', { reply_to_message_id: message.message_id })
			console.log({ id: userDbID, toProve, ogGroupName, ogGroupID, ogGroupProof })
			if (userDbID && toProve) {
				const [what, proof] = toProve.split('=')
				if (what === 'telegram' && payload === proof) {
					try {
						await pb.collection('Users').update(userDbID, {
							ogGroupID: ctx.chat.id,
							ogGroupName: ctx.chat.title,
							ogGroupProof: proof,
							toProve: ''
						})

						await pb.collection('Gatherings').create({
							telegramID: `verify:${genSecureRandom()}`,
							sage: userDbID,
							priceCurve: '',
							poolIndex: -1
						})

						return ctx.reply('Success! <a href="https://t.me/telesages_seed_bot/become">click here to continue</a>', {
							reply_to_message_id: message.message_id,
							parse_mode: 'HTML'
						})
					} catch (proofVerifiedError) {
						Sentry.captureException(proofVerifiedError)
						console.log({ proofVerifiedError })
						// TODO:
					}
				}
				else {
					return ctx.reply('wrong proof', { reply_to_message_id: message.message_id })
					//TODO: report
				}
			}
		} catch (dbError) {
			Sentry.captureException(dbError)
			console.log(dbError)
			if (dbError.status === 404) {
				return ctx.reply('you are not who you say you are?', { reply_to_message_id: message.message_id })
				//TODO: report
			} else {
				return ctx.reply('ooops something went wrong', { reply_to_message_id: message.message_id })
				//TODO: report
			}
		}
	} else return ctx.reply('invalid command', { reply_to_message_id: message.message_id })
})

bot.command('verifyGathering', async ctx => {
	const { command, payload, message } = ctx
	if (command === 'verifyGathering' && payload) {

		//TODO!!! check if its not already verified by someone else?

		try {
			const telegramID = ctx.from.id
			if (!await isOwner(ctx)) return ctx.reply('only owners are allowed!', { reply_to_message_id: message.message_id })

			const { id: userDbID } = await pb.collection('Users').getFirstListItem(`telegramID="${telegramID}"`)

			try {
				console.log({ userDbID, payload, x: `telegramID="verify:${payload}"&sage="${userDbID}"` })
				const { id, telegramID: verification } = await pb.collection('Gatherings').getFirstListItem(
					`telegramID="verify:${payload}"`
				)
				console.log({ id, verification, x: verification.split(':')[1] })
				if (id && verification.split(':')[1] === payload) {
					const { id: gatheringTelegramID, title, type } = message.chat
					if (gatheringTelegramID && title && type === 'group' || type === 'channel' || type === 'supergroup') {
						console.log({
							id,
							telegramID: gatheringTelegramID.toString(),
							name: title,
							verified: true,
							sage: userDbID
						})
						await pb.collection('Gatherings').update(id, {
							telegramID: gatheringTelegramID.toString(),
							name: title,
							verified: true,
							sage: userDbID
						})

						return ctx.reply('Success! <a href="https://t.me/telesages_seed_bot/become">click here to continue</a>', {
							reply_to_message_id: message.message_id,
							parse_mode: 'HTML'
						})
					} else {
						return ctx.reply('we currently support only groups and channels')
					}
				} else {
					return ctx.reply('invalid data')
				}
			} catch (errorCheckingIfGatheringToVerifyExists) {
				Sentry.captureException(errorCheckingIfGatheringToVerifyExists)
				console.error(errorCheckingIfGatheringToVerifyExists)
				return ctx.reply('invalid')
			}

			// TODO:! make sure its not there already
			// const gatherings = await pb.collection('Gatherings').getList(1, 1000, {
			// 	filter: `sage_id="${userDbID}"`
			// })

			// const newGathering = await pb.collection('Gatherings').create({
			// 	name: 'name of gathering from bot',
			// 	sage_id: userDbID
			// })

			// console.log(gatherings)
		} catch (dbError) {
			Sentry.captureException(dbError)
			if (dbError.status === 404) {
				ctx.sendMessage('you are not who you say you are?')
				//TODO: report
			} else {
				ctx.sendMessage('ooops something went wrong')
				//TODO: report
			}
		}
	} else return ctx.sendMessage('invalid command')
})

// bot.command('linked', async ctx => {
// 	// linked=payload
// 	const { id, is_bot, username, first_name, last_name } = ctx.from
// 	if(is_bot) return ctx.reply('bots not alowed')

// 	ctx.reply(`Deep link payload: ${ctx.payload}`)
// 	console.log(ctx)
// 	const user = {
// 		userID: id,
// 		userName: username,
// 		firstName: first_name,
// 		lastName: last_name
// 	}

// 	const userJSON = JSON.stringify(user)
// 	const encrypted = await encrypt(userJSON)

// 	await ctx.setChatMenuButton({
// 		text: "ENTER",
// 		type: "web_app",
// 		web_app: {
// 			url: `${WEB_APP_URL}`,
// 		},
// 	})
// })

bot.on('chat_member', async ctx => {
	const tgGroupID = ctx.update.chat_member.chat.id
	const tgUserID = ctx.update.chat_member.from.id
	const oldStatus = ctx.update.chat_member.old_chat_member.status
	const newStatus = ctx.update.chat_member.new_chat_member.status

	if (oldStatus === 'left' && newStatus === 'member') {
		const inviteLink = ctx.update.chat_member.invite_link.invite_link
		// const inviteStr = (new URL(inviteLink)).pathname.split('/')[1]

		try {
			const inviteDbID = await pb.collection('InvitationLinks').getFirstListItem(`link="${inviteLink}"`)
			await pb.collection('InvitationLinks').update(inviteDbID, {
				status: 'used'
			})

		} catch (err) {
			console.log(err)
			Sentry.captureException(err)
		}
		// ctx.reply(`userid: ${tgUserID} joined ${tgGroupID} from link: ${inviteLink}`)
	}

	// console.log('================================')
	// console.log(ctx.update)
	// console.log('================================')
})

bot.command('getthumbnail', async (ctx) => {
	const chatId = ctx.message.chat.id;
	const chat = await ctx.telegram.getChat(chatId);
	const thumbnail = chat.photo;
	console.log(thumbnail)
	const fileId = thumbnail.small_file_id;

	const x = new Telegram(BOT_KEY)


	console.log(await x.getFileLink(fileId))
	//TODO: update thumbnail in db and prompt for user if undefined, move to verifyGathering
	//TODO: add ui
	// request.post({
	//   url: `https://api.telegram.org/bot${BOT_KEY}/setChatPhoto`,
	//   formData: formData,
	// }, function (err, res, body) {
	//   if (err) {
	// 	console.error(err);
	// 	return;
	//   }
	//   console.log(body);
	// });
});

bot.launch({
	allowedUpdates: [
		'update_id',
		'message',
		'edited_message',
		'inline_query',
		'my_chat_member',
		'chat_member',
		'chat_join_request'
	],
})

// bot.on('text', (ctx) => {
// 	console.log('tu',ctx)
// 	ctx.reply('You said: ' + ctx.message.text)
// })

process.once('SIGINIT', () => bot.stop('SIGINIT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))