import mqtt from 'async-mqtt';
import ruuvi from 'node-ruuvitag';
import { Observable } from 'rxjs';

const client = mqtt.connect('mqtt://localhost');
//console.log('client is', client);

// connect to mqtt broker and publish a message
client.on('connect', async function () {
  console.log('connected');
  await client.subscribe('solar/edge002');
  // , function (err: any) {
  // if (!err) {
  //   // console.log("publishing");
  //   // client.publish("solar/edge002", JSON.stringify(stdout));
  // } else {
  //   console.log('subscribe error ', err);
  // }
  // });
});

// make observables from the event emitters
const ruuvi$ = Observable.create((observer: any) => {
  ruuvi.on('found', (val: any) => observer.next(val));
  ruuvi.on('error', (err: any) => observer.error(err));
});

let tag: any;

ruuvi$.subscribe({
  next: (val: any) => {
    console.log('ruuvi observable subscription val is ', val);
    tag = val;
  },
  error: (err: any) => {
    console.error('ruuvi observable error is ', err);
  },
});

const tag$ = new Observable((observer: any) => {
  tag.on('updated', (val: any) => observer.next(val));
  tag.on('error', (err: any) => observer.error(err));
});

tag$.subscribe({
  next: (val) => {
    console.log('tag observable subscription val is ', val);
  },
  error: (err) => {
    console.error('tag observable error is ', err);
  },
});

// read the tag and publish to mqtt channel each reading
ruuvi.on('found', (tag: any) => {
  console.log('Found RuuviTag, id: ' + tag.id);
  tag.on('updated', (data: any) => {
    const reading = JSON.stringify(data, null, '\t');
    console.log('Got data from RuuviTag ' + tag.id + ':\n' + reading);
    client.publish('solar/edge002', reading);
  });
});

ruuvi.on('warning', (message: any) => {
  console.error(new Error(message));
});
