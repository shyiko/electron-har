var Mb = 100000;  // 1 million Bytes in a Megabyte
var Kb = 1000;    // 1 thousand Bytes in a Kilobyte


/**
 * List of enumerated latency profiles
 * @sauce: https://github.com/atom/electron/blob/master/docs/api/session.md#sesenablenetworkemulationoptions
 * @type {Object}
 */
module.exports = {
  WIFI: {
    latency: 2,
    downloadThroughput: 30*Mb,
    uploadThroughput: 15*Mb
  },
  DSL: {
    latency: 5,
    downloadThroughput: 2*Mb,
    uploadThroughput: 1*Mb
  },
  REGULAR_4G: {
    latency: 20,
    downloadThroughput: 4*Mb,
    uploadThroughput: 3*Mb
  },
  GOOD_3G: {
    latency: 40,
    downloadThroughput: 1*Mb,
    uploadThroughput: 750*Kb
  },
  REGULAR_3G: {
    latency: 100,
    downloadThroughput: 750*Kb,
    uploadThroughput: 250*Kb
  },
  GOOD_2G: {
    latency: 150,
    downloadThroughput: 450*Kb,
    uploadThroughput: 150*Kb
  },
  REGULAR_2G: {
    latency: 300,
    downloadThroughput: 250*Kb,
    uploadThroughput: 50*Kb
  },
  GPRS: {
    latency: 500,
    downloadThroughput: 50*Kb,
    uploadThroughput: 20*Kb,
  }
};
