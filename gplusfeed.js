(function() {
  var DateFormat, app, atom_format, ejs, encoder, express, getPostTitle, getPosts, hasIndex, htmlSafe, http, https, processResponse, sendRequest, ymd_format;
  http = require('http');
  https = require('https');
  encoder = require('./encoder');
  express = require('express');
  ejs = require('ejs');
  DateFormat = require('dateformatjs').DateFormat;
  atom_format = new DateFormat("yyyy'-'MM'-'dd'T'HH':'mm':'sszzzz");
  ymd_format = new DateFormat("yyyy'-'MM'-'dd");
  app = express.createServer();
  app.configure(function() {
    app.use(express.static(__dirname + '/public'));
    app.set('views', __dirname + '/views');
    app.set('view engine', 'ejs');
    return app.set('view options', {
      layout: false
    });
  });
  hasIndex = function(ary, idx) {
    return ary !== null && typeof ary !== 'undefined' && ary.length > idx && typeof ary[idx] !== 'undefined' && ary[idx] !== null;
  };
  String.prototype.trim = function() {
    return this.replace(/^\s+|\s+$/g, '');
  };
  htmlSafe = function(s) {
    s = s.replace(/</g, "&lt;");
    s = s.replace(/>/g, "&gt;");
    s = s.replace(/&(?!amp|gt|lt)/g, "&amp;");
    return s;
  };
  getPosts = function(content) {
    var data, ret;
    content = content.slice(8);
    content = content.replace(/,,/mg, ',null,');
    content = content.replace(/,,/mg, ',null,');
    content = content.replace(/\[,/mg, '[null,');
    content = content.replace(/,\]/mg, ',null]');
    ret = [];
    try {
      data = JSON.parse(content);
      return ret = data[1][0];
    } catch (_e) {}
  };
  getPostTitle = function(desc) {
    var m, ptitle, sentend;
    ptitle = desc.replace(/<.*?>/g, ' ');
    ptitle = ptitle.replace(/\s+/g, ' ');
    ptitle = encoder.encoder.htmlDecode(ptitle);
    sentend = 75;
    m = ptitle.split(/[\.!\?\:]\s+/);
    if (m && m[0]) {
      sentend = m[0].length + 1;
    }
    if (sentend < 5 || sentend > 75) {
      sentend = 75;
    }
    return ptitle.slice(0, sentend);
  };
  processResponse = function(id, content) {
    var author, authorImg, desc, idx, output, permalink, post, postDate, posts, updatedTimestamp, _len;
    output = '';
    posts = getPosts(content);
    if (posts) {
      author = posts[0][3];
      authorImg = 'https:' + posts[0][18];
      updatedTimestamp = new Date(posts[0][5]);
      output += '<?xml version="1.0" encoding="UTF-8"?>\n';
      output += '<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="en">\n';
      output += '<title>' + author + ' - Google+ User output</title>\n';
      output += '<link href="https://plus.google.com/' + id + '" rel="alternate"></link>\n';
      output += '<link href="http://gplusfeed.herokuapp.com/' + id + '" rel="self"></link>\n';
      output += '<id>https://plus.google.com/' + id + '</id>\n';
      output += '<updated>' + atom_format.format(updatedTimestamp) + '</updated>\n';
      output += '<author><name>' + author + '</name></author>\n';
      for (idx = 0, _len = posts.length; idx < _len; idx++) {
        post = posts[idx];
        if (idx >= 10) {
          break;
        }
        postDate = new Date(post[5]);
        id = post[21];
        permalink = 'https://plus.google.com/' + post[21];
        desc = '';
        if (post[47]) {
          desc = post[47];
        } else if (post[4]) {
          desc = post[4];
        }
        if (post[44]) {
          desc = desc + ' <br /><br /><a href="https://plus.google.com/' + post[44][1] + '">' + post[44][0] + '</a> originally shared this post: ';
        }
        if (hasIndex(post, 66)) {
          if (hasIndex(post[66][0], 1) && hasIndex(post[66][0], 3)) {
            desc = desc + ' <br/><br/><a href="' + post[66][0][1] + '">' + post[66][0][3] + '</a>';
          }
          if (hasIndex(post[66][0], 6) && hasIndex(post[66][0][6], 0)) {
            try {
              if (post[66][0][6][0][1].indexOf('image') > -1) {
                desc = desc + ' <p><img src="http:' + post[66][0][6][0][2] + '"/>';
                if (hasIndex(post[66][0][6][0], 7)) {
                  desc += '<br />' + post[66][0][6][0][7];
                }
                desc += '</p>';
              } else {
                desc = desc + ' <a href="' + post[66][0][6][0][8] + '">' + post[66][0][6][0][8] + '</a>';
              }
            } catch (_e) {}
          }
        }
        if (desc === '') {
          desc = permalink;
        }
        output += "<entry>\n";
        output += '<title>' + htmlSafe(getPostTitle(desc)).trim() + '</title>\n';
        output += '<link href="' + permalink + '" rel="alternate"></link>\n';
        output += '<updated>' + atom_format.format(postDate) + '</updated>\n';
        output += '<id>tag:plus.google.com,' + ymd_format.format(postDate) + ':/' + id + '/</id>\n';
        output += '<summary type="html">' + htmlSafe(desc) + '</summary>\n';
        output += "</entry>\n";
      }
    }
    output += '</feed>\n';
    return output;
  };
  sendRequest = function(id, callback) {
    var content, options, req, url;
    url = '/_/stream/getactivities/' + id + '/?sp=[1,2,"' + id + '",null,null,null,null,"social.google.com",[]]';
    content = 'test';
    options = {
      host: 'plus.google.com',
      port: 443,
      path: url,
      method: 'GET'
    };
    req = https.request(options, function(res) {
      res.on('data', function(d) {
        if (res.statusCode === 200) {
          return content = content + d;
        }
      });
      res.on('end', function() {
        return callback(processResponse(id, content));
      });
      return res.on('close', function(err) {
        return callback(processResponse(id, content));
      });
    });
    req.end();
    return req.on('error', function(e) {
      return console.error(e);
    });
  };
  app.get('/', function(req, res) {
    return res.render('home');
  });
  app.get('/:id', function(req, res) {
    return sendRequest(req.params.id, function(feed) {
      if (feed === '') {
        return res.render('nodata', {
          p: req.params.id,
          up: atom_format.format(new Date())
        });
      } else {
        return res.send(feed);
      }
    });
  });
  app.listen(process.env.PORT || 3000);
}).call(this);
