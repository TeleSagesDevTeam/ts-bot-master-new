require('dotenv').config()
const crypto = require('crypto')

const SECRET = Buffer.from(process.env.SECRET, 'hex')

function encrypt(text) {
	return new Promise((resolve, reject) => {
		try {
			const iv = crypto.randomBytes(12)
			const cipher = crypto.createCipheriv(
				'chacha20-poly1305', SECRET, iv,
				{ authTagLength: 16 }
			)

			const encrypted = Buffer.concat([
				cipher.update(
					Buffer.from(text), 'utf8'),
					cipher.final()
			])
			const tag = cipher.getAuthTag()
			const final = Buffer.concat([iv, tag, encrypted]).toString('hex')

			resolve(final)
		} catch(err) {
			reject(err)
		}
	})
}

function decrypt (text) {
	return new Promise((resolve, reject) => {
		try {
			const decipher = crypto.createDecipheriv(
				'chacha20-poly1305',
				SECRET,
				Buffer.from(text.substring(0, 24), 'hex'),
				{ authTagLength: 16 }
			)
			decipher.setAuthTag(Buffer.from(text.substring(24, 56), 'hex'))
			const decrypted = [
				decipher.update(
					Buffer.from(text.substring(56), 'hex'),
					'binary', 'utf8'
				),
				decipher.final('utf8')
			].join('')

			resolve(decrypted)
		} catch(err) {
			reject(err)
		}
	})
}

function genSecureRandom () {
	const LENGTH = 16
	const randomValues = new Uint8Array(LENGTH)
	const randomBytes = crypto.getRandomValues(randomValues)

	return Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

module.exports = {
	decrypt,
	encrypt,
	genSecureRandom
}