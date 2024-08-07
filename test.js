require('dotenv').config()
const { pb } = require('./db.js')

try {
  const inviteLink = 'https://t.me/+VGFqyXKN5_sxNWY0'
  // const x = await pb.collection('InvitationLinks').getFullList()
  const x = await pb.collection('Users').getFirstListItem(`telegramID="6386201948"`)
  console.log(x)
  // const inviteDbID = await pb.collection('InvitationLinks').getFirstListItem(`link="${inviteLink}"`)
  // await pb.collection('InvitationLinks').update(inviteDbID, {
  //   status: 'used'
  // })

} catch(err) {
  console.log(err.message)
}