## telegram bot
This repository contains telegram bot responsible for:
- handling verifyOG command, which verifies ownership of original group, so that we know one who is creating a private new group (gathering) is one who is supposed to be.
- handling verifyGathering command, has to be run inside newly created group to verify that this group is supposed to be locked.
- monitoring new members joining gathering (private group) and setting invites as used


# uses bun to run, but is compatibile with node.js as well
`bun install`
`bun index.js`