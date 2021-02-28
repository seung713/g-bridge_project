const express = require('express');
const fs = require('fs');
const ejs = require('ejs');
const router = express.Router();
var loglevel = 1;

const url = require('url');
const mysql = require('mysql');

const db = mysql.createConnection({
  host: 'localhost',    // DB서버 IP주소
  port: 3306,           // DB서버 Port주소
  user: 'root',         // DB접속 아이디
  password: '111111',   // DB암호
  database: 'gbridge',  // 사용할 DB명
  multipleStatements: true  // 다중쿼리
});

const GetMainUI = (req, res) => {
  let htmlstream = '';
  logging(loglevel, '  GetMainUI() 호출 ! ');

  if (req.session.auth && req.session.prof) { // 교수자가 로그인했다면
    htmlstream = fs.readFileSync(__dirname + '/../views/prof_header.ejs', 'utf8');
    htmlstream += fs.readFileSync(__dirname + '/../views/prof_slider.ejs', 'utf8');
    htmlstream += fs.readFileSync(__dirname + '/../views/prof_index.ejs', 'utf8');
    htmlstream += fs.readFileSync(__dirname + '/../views/footer.ejs', 'utf8');
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf8'
    });

    db.query('SELECT * FROM lecture WHERE prof_id= ? ORDER BY id DESC;', [req.session.who], (error, results, fields) => {
      if (error) {
        htmlstream = fs.readFileSync(__dirname + '/../views/alert.ejs', 'utf8');
        res.status(562).end(ejs.render(htmlstream, {
          'title': '알림',
          'warn_title': 'DB 오류',
          'warn_message': '강의정보 조회 중 오류가 발생했습니다.',
          'return_url': '/'
        }));
      } else {
        res.end(ejs.render(htmlstream, {
          'logurl': '/user/logout',
          'loglabel': '로그아웃',
          'regurl': '/',
          'reglabel': req.session.who,
          lecdata: results
        }));
      }
    });
  } else {
    htmlstream = fs.readFileSync(__dirname + '/../views/header.ejs', 'utf8');
    htmlstream += fs.readFileSync(__dirname + '/../views/slider.ejs', 'utf8');
    htmlstream += fs.readFileSync(__dirname + '/../views/index.ejs', 'utf8');
    htmlstream += fs.readFileSync(__dirname + '/../views/footer.ejs', 'utf8');
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf8'
    });

    db.query('SELECT * FROM lecture ORDER BY id DESC LIMIT 3;', (error, results1, fields) => {
      if (error) {
        htmlstream = fs.readFileSync(__dirname + '/../views/alert.ejs', 'utf8');
        res.status(562).end(ejs.render(htmlstream, {
          'title': '알림',
          'warn_title': 'DB 오류',
          'warn_message': '강의 정보 조회 중 오류가 발생했습니다. 다시 시도해주세요.',
          'return_url': '/'
        }));
      } else {
        if (req.session.auth) { // 학습자가 로그인했다면
          db.query('SELECT e.user_id, e.lec_id, l.video, l.title, l.exp, l.prof_id FROM enrolment AS e JOIN lecture AS l ON e.lec_id=l.id WHERE e.user_id= ? LIMIT 3;', [req.session.who], (error, results2, fields) => { // 상품조회 SQL실행
            if (error) {
              htmlstream = fs.readFileSync(__dirname + '/../views/alert.ejs', 'utf8');
              res.status(562).end(ejs.render(htmlstream, {
                'title': '알림',
                'warn_title': 'DB 오류',
                'warn_message': '강의 정보 조회 중 오류가 발생했습니다. 다시 시도해주세요.',
                'return_url': '/'
              }));
            } else {
              res.end(ejs.render(htmlstream, {
                'logurl': '/user/logout',
                'loglabel': '로그아웃',
                'regurl': '/',
                'reglabel': req.session.who,
                lecdata: results1,
                enrolldata: results2
              }));
            }
          });
        } else {
          res.end(ejs.render(htmlstream, {
            'logurl': '/user/auth',
            'loglabel': '로그인',
            'regurl': '/user/reg',
            'reglabel': '회원가입',
            lecdata: results1,
            enrolldata: null
          }));
        }
      }
    });
  }
}

const logging = (level, logmsg) => {
  if (level != 0) {
    console.log(level, logmsg)
    loglevel++;
  }
}

router.get('/', GetMainUI);

const GetAll = (req, res) => {
  let htmlstream = '';

  htmlstream = fs.readFileSync(__dirname + '/../views/header.ejs', 'utf8');

  if (req.session.auth && req.session.prof) { // 교수자가 로그인했다면
    htmlstream = fs.readFileSync(__dirname + '/../views/alert.ejs', 'utf8');
    res.status(562).end(ejs.render(htmlstream, {
      'title': '알림',
      'warn_title': '권한 없음',
      'warn_message': '학습자로 로그인 후 이용할 수 있습니다.',
      'return_url': '/'
    }));
  } else {
    htmlstream += fs.readFileSync(__dirname + '/../views/index_all.ejs', 'utf8');
    htmlstream += fs.readFileSync(__dirname + '/../views/footer.ejs', 'utf8');
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf8'
    });

    db.query('SELECT * FROM lecture ORDER BY id DESC;', (error, results, fields) => {
      if (error) {
        htmlstream = fs.readFileSync(__dirname + '/../views/alert.ejs', 'utf8');
        res.status(562).end(ejs.render(htmlstream, {
          'title': '알림',
          'warn_title': 'DB 오류',
          'warn_message': '강의정보 조회 중 오류가 발생했습니다. 다시 시도해주세요',
          'return_url': '/'
        }));
      } else {
        if (req.session.auth) { // 학습자가 로그인했다면
          res.end(ejs.render(htmlstream, {
            'logurl': '/user/logout',
            'loglabel': '로그아웃',
            'regurl': '/user/reg',
            'reglabel': req.session.who,
            lecdata: results
          }));
        } else { // 비회원 로그인
          htmlstream = fs.readFileSync(__dirname + '/../views/alert.ejs', 'utf8');
          res.status(562).end(ejs.render(htmlstream, {
            'title': '알림',
            'warn_title': '권한 없음',
            'warn_message': '로그인 후 이용해주세요.',
            'return_url': '/user/auth'
          }));
        }
      }
    });
  }
}

router.get('/all', GetAll);

const GetEnroll = (req, res) => {
  let htmlstream = '';
  htmlstream = fs.readFileSync(__dirname + '/../views/header.ejs', 'utf8');

  if (req.session.auth && req.session.prof) { // 교수자가 로그인했다면
    htmlstream = fs.readFileSync(__dirname + '/../views/alert.ejs', 'utf8');
    res.status(562).end(ejs.render(htmlstream, {
      'title': '알림',
      'warn_title': '권한 없음',
      'warn_message': '사용자로 로그인 후 이용해주세요.',
      'return_url': '/'
    }));
  } else {
    htmlstream += fs.readFileSync(__dirname + '/../views/index_enroll.ejs', 'utf8');
    htmlstream += fs.readFileSync(__dirname + '/../views/footer.ejs', 'utf8');
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf8'
    });

    db.query('SELECT e.user_id, e.lec_id, l.video, l.title, l.exp, l.prof_id FROM enrolment AS e JOIN lecture AS l ON e.lec_id=l.id WHERE e.user_id= ?;', [req.session.who], (error, results, fields) => {
      if (error) {
        htmlstream = fs.readFileSync(__dirname + '/../views/alert.ejs', 'utf8');
        res.status(562).end(ejs.render(htmlstream, {
          'title': '알림',
          'warn_title': 'DB 오류',
          'warn_message': '강의정보 조회 중 오류가 발생했습니다. 다시 시도해주세요',
          'return_url': '/'
        }));
      } else {
        if (req.session.auth) { // 학습자 로그인
          res.end(ejs.render(htmlstream, {
            'logurl': '/user/logout',
            'loglabel': '로그아웃',
            'regurl': '/user/reg',
            'reglabel': req.session.who,
            enrolldata: results
          }));
        } else { // 비회원 로그인
          htmlstream = fs.readFileSync(__dirname + '/../views/alert.ejs', 'utf8');
          res.status(562).end(ejs.render(htmlstream, {
            'title': '알림',
            'warn_title': '권한 없음',
            'warn_message': '로그인 후 이용해주세요.',
            'return_url': '/user/auth'
          }));
        }
      }
    });
  }
}

router.get('/enroll', GetEnroll);

module.exports = router
