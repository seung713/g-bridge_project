const fs = require('fs');
const express = require('express');
const ejs = require('ejs');
const url = require('url');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const router = express.Router();

router.use(bodyParser.urlencoded({
  extended: false
}));

const db = mysql.createConnection({
  host: 'localhost', // DB서버 IP주소
  port: 3306, // DB서버 Port주소
  user: 'root', // DB접속 아이디
  password: 'goaqjrj1#', // DB암호
  database: 'gbridge', //사용할 DB명
  multipleStatements: true // 다중쿼리
});

// ------------------------------------  수강신청 기능 --------------------------------------
const HandleEnrolment = (req, res) => {
  let body = req.body;
  let sql_str = '';

  if (req.session.auth) {
    db.query('INSERT INTO enrolment (user_id, lec_id) VALUES (?, ?)', [req.session.who, body.lec_id], (error, _results1) => {
      if (error) {
        res.json({
          result: false,
          message: '이미 수강신청한 강의입니다.'
        });
      } else {
        db.query('SELECT id FROM quiz WHERE lec_id = ?', [body.lec_id], (error, results2) => {
          if (error) {
            res.json({
              result: false,
              message: '수강신청 중 오류가 발생했습니다. 다시 시도해주세요.'
            });
          } else {
            if (results2.length < 1) {
              res.json({
                result: true
              });
            } else {
              results2.forEach((item) => {
                sql_str += "INSERT INTO quizCheck (quiz_id, user_id) VALUES ('" + item.id + "', '" + req.session.who + "');";
              });
              db.query(sql_str, (error, _results3) => {
                if (error) {
                  res.json({
                    result: false,
                    message: '수강신청 중 오류가 발생했습니다. 다시 시도해주세요.'
                  });
                } else {
                  res.json({
                    result: true
                  });
                }
              });
            }
          }
        });
      }
    });
  } else {
    res.json({
      result: false,
      message: '로그인 후 이용해주세요.'
    });
  }
}
router.post('/', HandleEnrolment);

// ------------------------------------  사용자정보조회 기능 --------------------------------------
const PrintLearnerInfo = (req, res) => {
  let query = url.parse(req.url, true).query;
  htmlstream = '';
  sql_str = '';

  if (req.session.auth && req.session.prof) {
    htmlstream = fs.readFileSync(__dirname + '/../views/prof_header.ejs', 'utf8');
    htmlstream += fs.readFileSync(__dirname + '/../views/learner_info.ejs', 'utf8');
    htmlstream += fs.readFileSync(__dirname + '/../views/footer.ejs', 'utf8');
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf8'
    });

    db.query('SELECT e.user_id, e.lec_id, e.progress, u.name FROM enrolment AS e join user AS u ON e.user_id=u.id WHERE lec_id= ?;SELECT count(DISTINCT id) AS cnt FROM quiz WHERE lec_id=?;', [query.lec_id, query.lec_id], (error, results, fields) => {
      if (error) {
        htmlstream = fs.readFileSync(__dirname + '/../views/alert.ejs', 'utf8');
        res.status(562).end(ejs.render(htmlstream, {
          'title': '알림',
          'warn_title': 'DB 오류',
          'warn_message': '학습자 정보 조회 중 오류가 발생했습니다. 다시 시도해주세요.',
          'return_url': '/'
        }));
      } else {
        if (results[0].length < 1) {
          htmlstream = fs.readFileSync(__dirname + '/../views/alert.ejs', 'utf8');
          res.status(562).end(ejs.render(htmlstream, {
            'title': '알림',
            'warn_title': '학습자 없음',
            'warn_message': '조회된 학습자가 없습니다.',
            'return_url': '/'
          }));
        } else {
          results[0].forEach((item) => {
            sql_str += "SELECT sum(quizCheck.score) AS sum FROM quizCheck JOIN quiz ON quiz.id = quizCheck.quiz_id WHERE user_id ='" + item.user_id + "' and lec_id = '" + query.lec_id + "';";
          });
          db.query(sql_str, (error, results1) => {
            console.log(results1);
            if (error) {
              htmlstream = fs.readFileSync(__dirname + '/../views/alert.ejs', 'utf8');
              res.status(562).end(ejs.render(htmlstream, {
                'title': '알림',
                'warn_title': 'DB 오류',
                'warn_message': '학습자 정보 조회 중 오류가 발생했습니다. 다시 시도해주세요.',
                'return_url': '/'
              }));
            } else {
              results1.forEach((item, index) => {
                if (item.sum == null) {
                  item.sum = 0;
                }
              });
              res.end(ejs.render(htmlstream, {
                'logurl': '/user/logout',
                'loglabel': '로그아웃',
                'regurl': '/',
                'reglabel': req.session.who,
                data: results[0],
                cnt: results[1],
                quiz: results1
              }));
            }
          });
        }
      }
    });
  } else {
    htmlstream = fs.readFileSync(__dirname + '/../views/alert.ejs', 'utf8');
    res.status(562).end(ejs.render(htmlstream, {
      'title': '알림',
      'warn_title': '권한 없음',
      'warn_message': '로그인 후 이용해주세요.',
      'return_url': '/user/auth'
    }));
  }
}
router.get('/info', PrintLearnerInfo);

module.exports = router;
