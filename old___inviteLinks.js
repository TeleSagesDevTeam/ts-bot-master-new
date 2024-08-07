require('dotenv').config()
const polka = require('polka')
const bodyParser = require('body-parser')
const { Telegram } = require('telegraf')

const telegram = new Telegram(process.env.BOT_KEY)
const PORT = 3000

const app = polka()
app.use(bodyParser.json())

app.post('/grant', (req, res) => {
	console.log(req.body)
	const chatID = req.body.chatID
	const tx = req.body.tx

	telegram.createChatInviteLink(chatID, {
		member_limit: 1,
		// expire_date:
		// name: ''
	}).then(({ invite_link, is_revoked }) => {
		if(invite_link && !is_revoked) {
			res.end(invite_link)
		} else res.end('dupa')
	}).catch(error => {
		console.log('createChatInviteLink error: ', error)
		res.writeHead(500, {})
		res.end('An error occured.')
	})
})

app.post('/revoke', (req, res) => {
	const { chatID, userID } = req.body

	telegram.banChatMember(chatID, userID)
	.then(() => {
		res.end('User has been kicked...')
		//database update here?
	})
	.catch(error => {
		console.log('kickChatMember error: ', error)
		res.writeHead(500, {})
		res.end('And error occured.')
	})

	telegram.revokeChatInviteLink(chatID, inviteLink)
	.then(x => {
		console.log(x)
		res.end('revoked')
	})
	.catch(error => {
		console.log('revokeChatInviteLink error: ', error)
		res.writeHead(500, {})
		res.end('An error occured.')
	})
})

app.listen(PORT, () => { console.log(`Server is running on port: ${PORT}`)})