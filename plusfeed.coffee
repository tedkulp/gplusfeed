https = require 'https'
encoder = require './encoder'

htmlSafe = (s) ->
  s = s.replace /&/g, "&amp;"
  s = s.replace /</g, "&lt;"
  s.replace />/g, "&gt;"

getPosts = (content) ->
  content = content.slice(8)
  content = content.replace(/,,/mg, ',null,')
  content = content.replace(/,,/mg, ',null,')
  content = content.replace(/\[,/mg,'[null,')
  content = content.replace(/,\]/mg,',null]')

  data = JSON.parse(content)
  data[1][0]

getPostTitle = (desc) ->
  ptitle = encoder.encoder.htmlDecode desc
  ptitle = ptitle.replace(/<.*?>/g, ' ')
  ptitle = ptitle.replace(/\s+/g, ' ')

  sentend = 75

  m = ptitle.split(/[\.!\?\:]\s+/)
  if m and m[0]
    sentend = m[0].length + 1

  if sentend < 5 or sentend > 75
    sentend = 75

  ptitle.slice(0, sentend)

processResponse = (content) ->
  output = ''
  posts = getPosts(content)
  author = posts[0][3]
  authorImg = 'https:' + posts[0][18]
  updatedTimestamp = posts[0][5]

  output += '<?xml version="1.0" encoding="UTF-8"?>\n'
  output += '<output xmlns="http://www.w3.org/2005/Atom" xml:lang="en">\n'
  output += '<title>' + author + ' - Google+ User output</title>\n'
  output += '<link href="https://plus.google.com/' + p + '" rel="alternate"></link>\n'
  output += '<link href="http://plusfeed.heroku.com/' + p + '" rel="self"></link>\n'
  output += '<id>https://plus.google.com/' + p + '</id>\n'
  # output += '<updated>' + updated.strftime(ATOM_DATE) + '</updated>\n'
  output += '<author><name>' + author + '</name></author>\n'

  for post, idx in posts
    if idx >= 10
      break

    postDate = post[5]
    id = post[21]
    permalink = 'https://plus.google.com/' + post[21]

    desc = ''
    if post[47]
      desc = post[47]
    else if post[4]
      desc = post[4]

    if post[44]
      desc = desc + ' <br /><br /><a href="https://plus.google.com/' + post[44][1] + '">' + post[44][0] + '</a> originally shared this post: '

    if post[66]
      if post[66][0]
        if post[66][0][1]
          desc = desc + ' <br/><br/><a href="' + post[66][0][1] + '">' + post[66][0][3] + '</a>'

          if post[66][0][6]
            if post[66][0][6][0][1].indexOf('image') > -1
              desc = desc + ' <p><img src="http:' + post[66][0][6][0][2] + '"/></p>'
            else
              try
                desc = desc + ' <a href="' + post[66][0][6][0][8] + '">' + post[66][0][6][0][8] + '</a>'

    if desc == ''
      desc = permalink

    output += "<entry>\n"
    output += '<title>' + htmlSafe getPostTitle desc + '</title>\n'
    output += '<link href="' + permalink + '" rel="alternate"></link>\n'
    # output += '<updated>' + postDate.strftime(ATOM_DATE) + '</updated>\n'
    # output += '<id>tag:plus.google.com,' + postDate.strftime('%Y-%m-%d') + ':/' + id + '/</id>\n'
    output += '<summary type="html">' + htmlSafe desc + '</summary>\n'
    output += "</entry>\n"

  console.log output

sendRequest = (id) ->
  url = '/_/stream/getactivities/' + id + '/?sp=[1,2,"' + id + '",null,null,null,null,"social.google.com",[]]'
  content = 'test'

  options =
    host: 'plus.google.com',
    port: 443,
    path: url,
    method: 'GET'

  req = https.request options, (res) ->
    res.on 'data', (d) ->
      if res.statusCode == 200
        content = content + d
    res.on 'end', () ->
      processResponse content
    res.on 'close', (err) ->
      processResponse content

  req.end()

  req.on 'error', (e) ->
    console.error e

p = '116149856732656977048'
sendRequest p
