# StatEngine Client API

Client module to utilize StatEngine API

## Installation

Using npm:
```
npm install @statengine/se-api-client
```

## Usage
```
const se = new StatEngine();

se.ingest({
  id: 'file1.txt',
  firecaresId: '12345',
  payload: Buffer.from('incident data string').toString('base64'),
}, (err) => {
    if (err) console.error(err);
    else console.info('Gulp gulp gulp. Ingest was successful!')
});
```
## Contributing
Prior to issuing a pull request
```
npm run lint
npm run test
```
