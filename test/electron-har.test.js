const test = require('tap').test

const util = require('util')
const exec = util.promisify(require('child_process').exec)
const path = require('path')
const bin = path.join(__dirname, '..', 'bin', 'electron-har')
const createTestServer = require('create-test-server')

test('should include all resources before onload', async (t) => {
  const server = await createTestServer()
  t.tearDown(server.close)
  server.get('/', (req, res) => {
    res.type('text/html')
      .send('<!DOCTYPE html><script src="index.js"></script>')
  })
  server.get('/index.js', (req, res) => {
    res.type('application/javascript')
      .send('console.log("I wish I was a pony!')
  })
  const { stdout } = await exec(`${bin} ${server.url}`)
  const har = JSON.parse(stdout)
  t.equal(har.log.entries.length, 2) // html + script
})

test('should generate valid HAR even if url leads to something other than html', async (t) => {
  const server = await createTestServer()
  t.tearDown(server.close)
  server.get('/index.js', (req, res) => {
    res.type('application/javascript')
      .send('console.log("I wish I was a pony!')
  })
  const { stdout } = await exec(`${bin} ${server.url}/index.js`)
  const har = JSON.parse(stdout)
  t.equal(har.log.entries.length, 1)
})

test('should return an error in case of malformed url', async (t) => {
  try {
    await exec(`${bin} http://_`)
    t.fail()
  } catch (e) {
    t.true(e.message.includes('attempt to generate HAR resulted in error code -'))
  }
})

test('should attempt to authenticate in case url is protected', async (t) => {
  const server = await createTestServer()
  t.tearDown(server.close)
  server.get('/self-destruct', (req, res) => {
    if (req.get('authorization') === 'Basic ' +
      Buffer.from('jean_luc_picard:picard_4_7_alpha_tango')
        .toString('base64')) {
      res.set('Content-Type', 'text/plain')
      res.send('BOOM!')
    } else {
      res.set('WWW-Authenticate', 'Basic realm=Hogwarts')
      res.sendStatus(401)
    }
  })
  const { stdout } = await exec(`${bin} -u jean_luc_picard:picard_4_7_alpha_tango "${server.url}/self-destruct"`)
  const har = JSON.parse(stdout)
  t.equal(har.log.entries.length, 1)
  t.equal(har.log.entries[0].response.status, 200)
})

// 204 requires special handing (204 page is left "pending")
test('should return HAR in case of 204', async (t) => {
  const server = await createTestServer()
  t.tearDown(server.close)
  server.get('/204', (req, res) => {
    res.status(204).end()
  })
  server.get('/redirect-to-204', (req, res) => {
    res.redirect('/204')
  })
  const { stdout: stdout1 } = await exec(`${bin} ${server.url}/204`)
  const har1 = JSON.parse(stdout1)
  t.equal(har1.log.entries.length, 1)
  const { stdout: stdout2 } = await exec(`${bin} ${server.url}/redirect-to-204`)
  const har2 = JSON.parse(stdout2)
  t.equal(har2.log.entries.length, 2)
})

test('should return HAR in case of 404', async (t) => {
  const server = await createTestServer()
  t.tearDown(server.close)
  server.get('/', (req, res) => {
    res.status(404).end()
  })
  const { stdout } = await exec(`${bin} ${server.url}/`)
  const har = JSON.parse(stdout)
  t.equal(har.log.entries.length, 1)
})

test('should return HAR even if some of the subrequests fail', async (t) => {
  const server = await createTestServer()
  t.tearDown(server.close)
  server.get('/', (req, res) => {
    res.type('text/html')
      .send('<!DOCTYPE html><script src="index.js"></script>' +
        '<script src="index2.js"></script>')
  })
  server.get('/index.js', (req, res) => {
    res.status(204).end()
  })
  const { stdout } = await exec(`${bin} ${server.url}/`)
  const har = JSON.parse(stdout)
  t.equal(har.log.entries.length, 3)
})
