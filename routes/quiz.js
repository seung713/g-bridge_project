const fs = require('fs');
const express = require('express');
const ejs = require('ejs');
const url = require('url');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const session = require('express-session');
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

// ------------------------------------  퀴즈출제양식 출력 --------------------------------------
const PrintQuizForm = (req, res) => {
  let query = url.parse(req.url, true).query;
  console.log(query);
  let htmlstream = '';
  htmlstream = fs.readFileSync(__dirname + '/../views/prof_header.ejs', 'utf8');
  htmlstream += fs.readFileSync(__dirname + '/../views/quiz_form.ejs', 'utf8');
  htmlstream += fs.readFileSync(__dirname + '/../views/footer.ejs', 'utf8');
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf8'
  });
  res.end(ejs.render(htmlstream, {
    'logurl': '/user/logout',
    'loglabel': '로그아웃',
    'regurl': '/',
    'reglabel': req.session.who,
    data: query.lec_id
  }));
};

// ------------------------------------  퀴즈출제양식 처리 --------------------------------------
const HandleQuizForm = (req, res) => {
  let body = req.body;
  let sql_str = '';
  db.query('INSERT INTO quiz (lec_id, question, ex1, ex2, ex3, ex4, answer) VALUES (?, ?, ?, ?, ?, ?, ?);SELECT user_id FROM enrolment WHERE lec_id= ?;', [body.lec_id, body.question, body.ex1, body.ex2, body.ex3, body.ex4, body.answer, body.lec_id], (error, results1, fields) => {
    if (error) {
      res.json({
        result: false,
        message: '퀴즈등록 중 오류가 발생했습니다.'
      });
    } else {
      db.query('SELECT id FROM quiz WHERE lec_id= ? ORDER BY id desc LIMIT 1', [body.lec_id], (error, results2, fields) => {
        if (error) {
          res.json({
            result: false,
            message: '퀴즈등록 중 오류가 발생했습니다.'
          });
        } else {
          if (results1[1].length < 1) {
            res.json({
              result: true
            });
          } else {
            results1[1].forEach((item, index) => {
              sql_str += "INSERT INTO quizCheck (quiz_id, user_id) VALUES ('" + results2[0].id + "', '" + item.user_id + "');";
            });
            db.query(sql_str, (error, results3, fields) => {
              if (error) {
                res.json({
                  result: false,
                  message: '퀴즈등록 중 오류가 발생했습니다.'
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
}
router.get('/prof', PrintQuizForm);
router.post('/prof', HandleQuizForm);

// ------------------------------------  퀴즈조회 기능 --------------------------------------
const PrintQuiz = (req, res) => {
  let query = url.parse(req.url, true).query;
  let htmlstream = '';

  htmlstream = fs.readFileSync(__dirname + '/../views/header.ejs', 'utf8');
  htmlstream += fs.readFileSync(__dirname + '/../views/quiz.ejs', 'utf8');
  htmlstream += fs.readFileSync(__dirname + '/../views/footer.ejs', 'utf8');

  db.query('SELECT * FROM quiz WHERE id =? ORDER BY id', [query.quiz_id], (error, results) => {
    if (error) {
      htmlstream = fs.readFileSync(__dirname + '/../views/alert.ejs', 'utf8');
      res.status(562).end(ejs.render(htmlstream, {
        'title': '알림',
        'warn_title': 'DB 오류',
        'warn_message': '퀴즈정보 조회 중 오류가 발생했습니다.',
        'return_url': '/'
      }));
    } else {
      res.end(ejs.render(htmlstream, {
        'logurl': '/user/logout',
        'loglabel': '로그아웃',
        'regurl': '/user/reg',
        'reglabel': req.session.who,
        quizdata: results,
        data: query.lec_id
      }));
    }
  });
};

// ------------------------------------  퀴즈처리 기능 --------------------------------------
const HandleQuiz = (req, res) => {
  let body = req.body;

  db.query('UPDATE quizCheck SET score=1 WHERE user_id = ? AND quiz_id = ?;', [req.session.who, body.quiz_id], (error, results, fields) => {
    if (error) {
      res.json({
        result: false,
        message: 'DB변경 중 오류가 발생했습니다.'
      });
    } else {
      res.json({
        result: true
      });
    }
  });
}
router.get('/learner', PrintQuiz);
router.post('/learner', HandleQuiz);

// ------------------------------------  퀴즈정보조회 기능 --------------------------------------
const PrintQuizInfo = (req, res) => {
  let query = url.parse(req.url, true).query;
  htmlstream = '';
  sql_str = '';
  sql_str2 = '';

  htmlstream = fs.readFileSync(__dirname + '/../views/prof_header.ejs', 'utf8');
  htmlstream += fs.readFileSync(__dirname + '/../views/quiz_info.ejs', 'utf8');
  htmlstream += fs.readFileSync(__dirname + '/../views/footer.ejs', 'utf8');
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf8'
  });
  db.query('SELECT q.id, q.question, q.answer, l.title FROM quiz AS q JOIN lecture AS l ON q.lec_id = l.id WHERE prof_id = ? ORDER BY l.id, q.lec_id;', [req.session.who], (error, results, fields) => {
    if (error) {
      htmlstream = fs.readFileSync(__dirname + '/../views/alert.ejs', 'utf8');
      res.status(562).end(ejs.render(htmlstream, {
        'title': '알림',
        'warn_title': 'DB 오류',
        'warn_message': '강의정보 조회 중 오류가 발생했습니다. 다시 시도해주세요.',
        'return_url': '/'
      }));
    } else {
      res.end(ejs.render(htmlstream, {
        'logurl': '/user/logout',
        'loglabel': '로그아웃',
        'regurl': '/user/reg',
        'reglabel': req.session.who,
        quizdata: results
      }));

    }
  });
}
router.get('/info', PrintQuizInfo);

// ------------------------------------  퀴즈 삭제 기능 --------------------------------------
const DeleteQuiz = (req, res) => {
  let body = req.body;

  db.query('DELETE FROM quiz WHERE id = ?;', [body.quiz_id], (error, results, fields) => {
    if (error) {
      res.json({
        result: false,
        message: '퀴즈 삭제에 실패했습니다. 다시 시도해주세요.'
      });
    } else {
      res.json({
        result: true
      });
    }
  });
};
router.post('/delete', DeleteQuiz);


module.exports = router;
