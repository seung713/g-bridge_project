const fs = require('fs');
const express = require('express');
const ejs = require('ejs');
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
  password: '111111', // DB암호
  database: 'gbridge' //사용할 DB명
});

// ------------------------------------  회원가입 기능 --------------------------------------
const PrintRegistrationForm = (req, res) => {
  let htmlstream = '';
  htmlstream = fs.readFileSync(__dirname + '/../views/header.ejs', 'utf8');
  htmlstream += fs.readFileSync(__dirname + '/../views/reg_form.ejs', 'utf8');
  htmlstream += fs.readFileSync(__dirname + '/../views/footer.ejs', 'utf8');
  res.writeHead(200, {
  'Content-Type': 'text/html; charset=utf8'
});
  res.end(ejs.render(htmlstream, {
    'logurl': '/user/auth',
    'loglabel': '로그인',
    'regurl': '/user/reg',
    'reglabel': '회원가입'
  }));
};

const HandleRegistration = (req, res) => {
  let body = req.body;

  console.log('회원가입 입력정보: %s, %s', body.id, body.pw);

  db.query('INSERT INTO user (id, pw, name, category) VALUES (?, ?, ?, ?)', [body.id, body.pw, body.name, body.category], (error, results, fields) => {
    if (error) {
      res.json({
        result: false,
        message: '이미 회원으로 등록된 아이디입니다. 다시 시도해주세요.'
      });
    } else {
      console.log("회원가입에 성공했습니다.");
      res.json({
        result: true
      });
    }
  });
};

router.get('/reg', PrintRegistrationForm);
router.post('/reg', HandleRegistration);

// ------------------------------------  로그인 기능 --------------------------------------

const PrintLoginForm = (req, res) => {
  let htmlstream = '';
  htmlstream = fs.readFileSync(__dirname + '/../views/header.ejs', 'utf8');
  htmlstream += fs.readFileSync(__dirname + '/../views/login_form.ejs', 'utf8');
  htmlstream += fs.readFileSync(__dirname + '/../views/footer.ejs', 'utf8');
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf8'
  });
  res.end(ejs.render(htmlstream, {
    'logurl': '/user/auth',
    'loglabel': '로그인',
    'regurl': '/user/reg',
    'reglabel': '회원가입'
  }));
};

const HandleLogin = (req, res) => {
  let body = req.body;
  let id, pw, category;

  console.log('로그인 입력정보: %s, %s', body.id, body.pw);

  db.query("SELECT * FROM user WHERE id =? AND pw= ?", [body.id, body.pw], (error, results, fields) => {
    if (error) {
      res.json({
        result: false,
        message: '로그인 실패했습니다. 다시 시도해주세요.'
      });
    } else {
      if (results.length <= 0) { // 조회결과가 없는 경우
        res.json({
          result: false,
          message: '회원가입 후 이용해주세요.'
        });
      } else { // 조회결과가 있는 경우
        results.forEach((item, index) => {
          id = item.id;
          pw = item.pw;
          category = item.category;

          console.log("로그인 성공한 ID/암호:%s/%s", id, pw);

          if (body.id == id && body.pw == pw) {
            req.session.auth = 99;      // 임의로 수(99)로 로그인성공했다는 것을 설정함
            req.session.who = id;       // 인증된 사용자명 확보 (로그인후 이름출력용)
            if (category == 1)          // 만약, 인증된 사용자가 관리자(admin)라면 이를 표시
              req.session.prof = true;
          }
          res.json({result: true});
        });
      }
    }
  });
}

router.get('/auth', PrintLoginForm);
router.post('/auth', HandleLogin);

// ------------------------------------  로그아웃 기능 --------------------------------------

const HandleLogout = (req, res) => {
  req.session.destroy(); // 세션 제거
  res.redirect('/');    // 메인화면으로 재접속
}

router.get('/logout', HandleLogout);

module.exports = router;
