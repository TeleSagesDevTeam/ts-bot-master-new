import { pb } from './db.js'
const eventsource = require("eventsource")

// @ts-ignore
global.EventSource = eventsource;

pb.collection("Users").subscribe("*", (d) => {
  console.log(d);
});