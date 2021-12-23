import mqtt from 'async-mqtt';
import EventEmitter from 'events';
import ruuvi from 'node-ruuvitag';
import { fromEvent, Observable, auditTime } from 'rxjs';

const client = mqtt.connect('mqtt://localhost');
//console.log('client is', client);

// connect to mqtt broker and publish a message
client.on('connect', async function () {
  console.log('connected');
  await client.subscribe('solar/edge001');
  // , function (err: any) {
  // if (!err) {
  //   // console.log("publishing");
  //   // client.publish("solar/edge002", JSON.stringify(stdout));
  // } else {
  //   console.log('subscribe error ', err);
  // }
  // });
});

// IIFE to use await but not at top level
void (async function () {
  const t = await ruuvi.findTags();
  console.log('tags in IIFE are ', t);

  // setup observables from first found tag updated event
  const readings$: Observable<any> = fromEvent(t[0], 'updated');
  const warnings$: Observable<any> = fromEvent(t[0], 'warning');

  // take a reading every time period (don't use debounceTime!!!!!!)
  const timedReadings$ = readings$.pipe(auditTime(60000));

  timedReadings$.subscribe({
    next: async (reading) => {
      // console.log('Reading from ruuvi tag with delay is ', reading);
      // publish the reading as JSON to MQTT
      const JSONreading = JSON.stringify(reading, null, '\t');
      console.log(
        'Got data with delay from RuuviTag ' + t[0].id + ':\n' + JSONreading
      );
      // push the reading into mqtt
      const published = await client.publish('solar/edge001', JSONreading);
      console.log('published response ', published);
    },
    error: (err) => {
      console.error('issue with getting readings ', err);
    },
  });

  // capture any warnings from the tag (or errors from the warnings!)
  warnings$.subscribe({
    next: (warning) => {
      console.error(new Error(warning));
    },
    error: (err) => {
      console.error(new Error(err));
    },
  });

  // check the event emitter is emitting
  t[0].on('updated', (data: any) => {
    console.log('received data from updated event ');
  });
})(); // IIFE

//   // // event callback based logic
//   // // read the tag and publish to mqtt channel each reading
//   // ruuvi.on('found', (tag: any) => {
//   //   console.log('Found RuuviTag, id: ' + tag.id);
//   //   tag.on('updated', (data: any) => {
//   //     const reading = JSON.stringify(data, null, '\t');
//   //     console.log('Got data from RuuviTag ' + tag.id + ':\n' + reading);
//   //     client.publish('solar/edge002', reading);
//   //   });
//   // });

//   // ruuvi.on('warning', (message: any) => {
//   //   console.error(new Error(message));
// });
