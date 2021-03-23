const fs = require('fs');
const express = require('express');
const ejs = require('ejs');
const url = require('url');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const multer = require('multer');
const upload = multer({
  dest: __dirname + '/../public/videos/uploads/lectures'
}); // 업로드 디렉터리를 설정한다.

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

// ------------------------------------ 강의등록양식 출력  --------------------------------------
const PrintLecRegForm = (req, res) => {
  let htmlstream = '';

  if (req.session.auth && req.session.prof) {
    htmlstream = fs.readFileSync(__dirname + '/../views/prof_header.ejs', 'utf8');
    htmlstream += fs.readFileSync(__dirname + '/../views/lecture_form.ejs', 'utf8');
    htmlstream += fs.readFileSync(__dirname + '/../views/footer.ejs', 'utf8');
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf8'
    });
    res.end(ejs.render(htmlstream, {
      'logurl': '/user/logout',
      'loglabel': '로그아웃',
      'regurl': '/',
      'reglabel': req.session.who
    }));
  } else {
    htmlstream = fs.readFileSync(__dirname + '/../views/alert.ejs', 'utf8');
    res.status(562).end(ejs.render(htmlstream, {
      'title': '알림',
      'warn_title': '권한 없음',
      'warn_message': '로그인 후 이용해주세요.',
      'return_url': '/user/auth'
    }));
  }
};

// ------------------------------------  강의등록 기능 --------------------------------------
const HandleLecReg = (req, res) => {
  let body = req.body;
  let video = '/videos/uploads/lectures/';
  let file = req.file;
  video = video + file.filename;

  db.query('INSERT INTO lecture (title, exp, prof_id, video) VALUES (?, ?, ?, ?)', [body.title, body.exp, req.session.who, video], (error, results, fields) => {
    if (error) {
      res.json({
        result: false,
        message: '강의등록 중 오류가 발생했습니다. 다시 시도해주세요.'
      });
    } else {
      res.json({
        result: true
      });
    }
  });
};

router.get('/reg', PrintLecRegForm);
router.post('/reg', upload.single('video'), HandleLecReg);

// ------------------------------------  강의조회 기능 --------------------------------------
const PrintLec = (req, res) => {
  let htmlstream = '';
  let query = url.parse(req.url, true).query;

  htmlstream = fs.readFileSync(__dirname + '/../views/header.ejs', 'utf8');
  htmlstream += fs.readFileSync(__dirname + '/../views/lecture.ejs', 'utf8');
  htmlstream += fs.readFileSync(__dirname + '/../views/footer.ejs', 'utf8');
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf8'
  });

  if (req.session.auth) {
    db.query('SELECT * FROM enrolment AS e JOIN lecture AS l on e.lec_id=l.id WHERE user_id=? AND lec_id= ?', [req.session.who, query.lec_id], (error, results1, fields) => {
      if (error) {
        htmlstream = fs.readFileSync(__dirname + '/../views/alert.ejs', 'utf8');
        res.status(562).end(ejs.render(htmlstream, {
          'title': '알림',
          'warn_title': 'DB 오류',
          'warn_message': '강의정보 조회 중 오류가 발생했습니다. 다시 시도해주세요.',
          'return_url': '/'
        }));
      } else {
        db.query('SELECT q.id, q.lec_id, c.score FROM quiz AS q join quizCheck AS c on q.id=c.quiz_id WHERE user_id= ? AND lec_id = ?;', [req.session.who, query.lec_id], (error, results2, fields) => {
          if (error) {
            htmlstream = fs.readFileSync(__dirname + '/../views/alert.ejs', 'utf8');
            res.status(562).end(ejs.render(htmlstream, {
              'title': '알림',
              'warn_title': 'DB 오류',
              'warn_message': '퀴즈정보 조회 중 오류가 발생했습니다. 다시 시도해주세요.',
              'return_url': '/'
            }));
          } else {
            res.end(ejs.render(htmlstream, {
              'logurl': '/user/logout',
              'loglabel': '로그아웃',
              'regurl': '/',
              'reglabel': req.session.who,
              lecdata: results1,
              quizdata: results2,
              lec_id: query.lec_id
            }));
          }
        });
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
};

// ------------------------------------  학습정보저장 기능 --------------------------------------
const HandleLec = (req, res) => {
  let body = req.body;

  db.query('UPDATE enrolment SET progress=? WHERE user_id = ? AND lec_id = ? ', [body.progress, req.session.who, body.lec_id], (error, results, fields) => {
    if (error) {
      res.json({
        result: false,
        message: '학습정보 저장에 실패했습니다. 다시 시도해주세요.'
      });
    } else {
      res.json({
        result: true
      });
    }
  });
};

router.get('/video', PrintLec);
router.post('/video', HandleLec);

// ------------------------------------  강의정보 조회 기능 --------------------------------------
const PrintLecInfo = (req, res) => {
  htmlstream = '';
  sql_str = '';

  if (req.session.auth && req.session.prof) {
    htmlstream = fs.readFileSync(__dirname + '/../views/prof_header.ejs', 'utf8');
    htmlstream += fs.readFileSync(__dirname + '/../views/lecture_info.ejs', 'utf8');
    htmlstream += fs.readFileSync(__dirname + '/../views/footer.ejs', 'utf8');
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf8'
    });

    db.query('SELECT * FROM lecture WHERE prof_id = ? ORDER BY id;', [req.session.who], (error, results1) => {
      if (error) {
        htmlstream = fs.readFileSync(__dirname + '/../views/alert.ejs', 'utf8');
        res.status(562).end(ejs.render(htmlstream, {
          'title': '알림',
          'warn_title': 'DB 오류',
          'warn_message': '강의정보 조회 중 오류가 발생했습니다. 다시 시도해주세요.',
          'return_url': '/'
        }));
      } else {
        if (results1.length <= 0) { // 조회결과가 없는 경우
          res.end(ejs.render(htmlstream, {
            'logurl': '/user/logout',
            'loglabel': '로그아웃',
            'regurl': '/',
            'reglabel': req.session.who,
            'warn_message': '조회된 강의가 없습니다.',
            lecdata: results1
          }));
        } else {
        results1.forEach((item) => {
          sql_str += "SELECT count(user_id) as learner FROM enrolment WHERE lec_id ='" + item.id + "';";
          sql_str += "SELECT count(DISTINCT id) as quiz FROM quiz WHERE lec_id ='" + item.id + "';";
        });
        db.query(sql_str, (error, results2) => {
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
              'regurl': '/',
              'reglabel': req.session.who,
              lecdata: results1,
              lqdata: results2
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
router.get('/info', PrintLecInfo);

// ------------------------------------  강의삭제 기능 --------------------------------------
const DeleteLec = (req, res) => {
  let body = req.body;

  db.query('DELETE FROM lecture WHERE id = ?;', [body.lec_id], (error) => {
    if (error) {
      res.json({
        result: false,
        message: '강의 삭제에 실패했습니다. 다시 시도해주세요.'
      });
    } else {
      res.json({
        result: true
      });
    }
  });
};
router.post('/delete', DeleteLec);

module.exports = router;
