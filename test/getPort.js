const portfinder = require('../lib/portfinder');

if (process.argv[2]) {
  const port = process.argv[2];
  if (isNaN(port)) {
    console.log('passed value is not a port');
  } else {
    portfinder.basePort = port;
  }
}

portfinder.getPort(function(err, port) {
  if (err) {
    console.error(err);
  } else {
    console.log(port);
  }
});
