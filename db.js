require('dotenv').config()
const PocketBase = require('pocketbase/cjs')

const { BACKEND_TOKEN, POCKETBASE_URL } = process.env
const pb = new PocketBase(POCKETBASE_URL)

pb.beforeSend = function(url, options) {
	console.log({ BACKEND_TOKEN, POCKETBASE_URL })
	options.headers = Object.assign({}, options.headers, {
		'bakend_token': BACKEND_TOKEN
	})
}
module.exports = {
	pb
}