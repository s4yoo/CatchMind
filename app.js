var socketio = require('socket.io');
var express = require('express');
var http = require('http');
var ejs = require('ejs');
var fs =require('fs');
var mysql = require('mysql');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');

var questions = [
'수박', '사과', '만두', '달력',
'치약', '칫솔', '빨대', '컵',
'시계', '선풍기', '화분', '지갑',
'열쇠', '담배', '쿠폰', '휴대폰',
'책상', '의자', '바람', '해',
'달', '별', '구름', '나무',
'칼', '가스렌지', '전자렌지', '냉장고',
'무우', '파스타', '얼음', '콜라',
'사이다', '초코파이', '회사', '축구',
'야구', '축구', '배구', '킬러',
'독수리', '사자', '곰', '호랑이'
];
var room_master = {};
var room_title = {};
var room_uid = {};
var room_question = {};
var room_nickname = {};


var client = mysql.createConnection({
  user: 'root',
  password: '1234',
  database: 'TermProject'
});

var app = express();
app.use(express.static('public'));
app.use(cookieParser());
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(session({
  secret: 'secret key',
  resave: false,
  saveUninitialized: true
}))

var server = http.createServer(app);

server.listen(52273, function(){
  console.log('Server Running at 127.0.0.1:52273');
});

var io = socketio.listen(server);
//var count = 0;

function getRandString(length){
  var base = 'abcdefghijklmnopqrstuvwxyz0123456789';

  var result = '';
  for(var i = 0; i < length; i ++) {
    result += base[Math.floor((Math.random() * ((base.length - 1) - 0 + 1)) + 0)]
  }
  return result;
}
var roomId = "";

io.sockets.on('connection', function (socket){


  function getRoomList(){
    var rooms = [];
    for(var id in io.sockets.adapter.rooms){
      if(id.match(/^[0-9a-z]{32}$/gi) != null){
        rooms.push({
          id: id,
          master: room_master[id],
          title: room_title[id],
          count: io.sockets.adapter.rooms[id].length
        });
      }
    }
    return rooms;
  }

/*  socket.on('join', function (data){
    socket.join(data);
    roomId = data;
  //  count++;
    console.log('방입장' + roomId + ' count: ' + count);
  });*/

  socket.on('getRoomList', function(data){
    socket.emit('getRoomList', {room: getRoomList()});
  });

  socket.on('makeRoom', function(data){
    var id = getRandString(32);
    roomId = id;
    socket.join(id);
    room_master[id] = data.uid;
    room_title[id] = data.title;

    console.log('방장: ' + room_master[id] + ', 방 이름: ' + room_title[id]);

    io.sockets.emit('getRoomList', {room: getRoomList()});
    socket.emit('joinRoom', {room_id: id});
  });

  socket.on('joinRoom', function(data){
    socket.join(data.room_id);
    socket.broadcast.emit('getRoomList', {room: getRoomList()});
  });

  socket.on('playerList', function(data){
    room_uid[socket.id] = data.uid;
    room_nickname[data.uid] = data.nickname;

    io.sockets.in(data.room_id).emit('playerList', {
      title: room_title[data.room_id],
      list: io.sockets.adapter.rooms[data.room_id].sockets,
      uid: room_uid,
      nickname: room_nickname,
      master: room_master[data.room_id]
    });
  });

  socket.on('changemaster', function(data){
    room_master[data.room_id] = data.uid;
    io.sockets.in(data.room_id).emit('changeMaster',{
      room_id: data.room_id,
      uid: data.uid
    });
  });

  socket.on('sendMessage', function(data){
    io.sockets.in(data.room_id).emit('displayMessage', {
      nickname: data.nickname,
      msg: data.msg
    });
    if(data.msg == room_question[data.room_id]){
      io.sockets.in(data.room_id).emit('congratulationAnswer', {
        uid: data.uid,
        nickname: data.nickanme
      });
    }
  });

  socket.on('playGame', function(data){
    io.sockets.in(data.room_id).emit('playGame', {time: data.time});
  });

  socket.on('getQuestion', function(data){
    room_question[data.room_id] = questions[Math.floor((Math.random() * ((questions.length - 1) - 0 + 1)) + 0)]
    io.sockets.in(data.room_id).emit('getQuestion', {question: room_question[data.room_id]});
    console.log('문제: ' + room_question[data.room_id]);
  });

  socket.on('initializeCanvasCoords', function(data){
    socket.broadcast.to(data.room_id).emit('initializecanvasCoords', {
      x: data.x,
      y: data.y
    });
  });

/*  socket.on('drawCanvasCoords', function(data){
    socket.broadcast.to(data.room_id).emit('drawCanvasCoords',{
      x: data.x,
      y: data.y,
      close: data.close
    });
  });
*/
  socket.on('changeCanvasColor', function(data){
    socket.broadcast.to(data.room_id).emit('changeCanvasColor',{
      color: data.color
    });
  });

/*  socket.on('changeCanvasStroke', function(data){
    socket.broadcast.to(data.room_id).emit('changeCanvasStroke', {
      stroke: data.storke
    });
  });*/

  socket.on('clearCanvas', function(data){
    socket.broadcast.to(data.room_id).emit('clearCanvas');
  });

  socket.on('disconnect', function(){
    io.sockets.emit('getRoomList', {
      room: getRoomList()
    });
    io.sockets.emit('checkPlayer');
    console.log('disconnect');
  });
/*  socket.on('leave', function (data){
    socket.leave(data);
  //  count--;
    console.log('방 퇴장' + roomId);
  })
*/
  socket.on('draw', function (data){
    io.sockets.in(roomId).emit('line', data);
   //console.log('그림그리기 시작');
  });

/*  socket.on('create_room', function (data){
    io.sockets.emit('create_room', data.toString());
    console.log('방생성' + roomId);
  });*/

/*  socket.on('gameJoin', function(data){
    io.sockets.emit('gameJoin', data.toString());
    console.log(data);
  });

  socket.on('message', function (data){ // 메시지 보내기
  //  data.name=socket.request.session.user
    io.sockets.emit('message', data);
    console.log(data);
  });*/
});


app.get('/', function (request, response){  //로그인
  fs.readFile('login.html', function(error, data){
    response.send(data.toString());
  });
});
/*
io.sockets.on('disconnect', function(socket){
  count--;
  console.log("count: " + count);
})
*/
app.post('/', function(request, response){  //로그인
  client.query('SELECT id FROM user WHERE id = ?', [request.body.id], function(error, result){
    if(error){ // 예외 상황 발생 시
      response.redirect('/');
      console.log(error);
    } else if(result == 0){ // 아이디가 존재하지 않을 경우
      //아이디가 존재하지 않습니다 회원 가입 페이지로 넘어갑니다 알림창 넣기
      response.send('<script type="text/javascript">alert("아이디가 존재하지 않습니다. 회원가입 페이지로 넘어갑니다."); document.location.href="/signup"</script>');
      //response.redirect('/signup');
      console.log('id error');
    } else { // 아이디가 맞을 경우
      client.query('SELECT password FROM user WHERE password = ?', [request.body.password], function(error, result){
        if (error){//예외 상황 발생 시
          response.redirect('/');
          console.log(error);
        } else if(result == 0){ // 아이디는 맞는데 비밀번호가 틀릴 경우
          //여기에 '비밀번호 또는 아이디가 틀립니다'라고 알람창 넣기
          response.send('<script type="text/javascript">alert("비밀번호가 틀렸습니다."); document.location.href="/"</script>');
          console.log('password error');
        } else {// 둘다 맞을 경우
          // 쿠키 설정
            response.cookie("uid", request.body.id, {
              expires: new Date(Date.now() + 900000),
              httpOnly: true
            });
          //session 설정
        /*request.session.user = {
            "name" : request.body.id
          }*/
          response.redirect('/lobby');
          console.log("비밀번호 일치");
        }
      });
    }
  });
});

app.get('/signup', function (request, response){  //회원가입
  fs.readFile('signup.html', function(error, data){
    response.send(data.toString());
  });
});

app.post('/signup', function(request, response){
  client.query('SELECT id FROM user WHERE id = ?', [request.body.id], function(error, result){
    if(error){
      response.redirect('/');
      console.log(error);
    } else if(result == 0){
      if(request.body.password == request.body.pwChk){
        console.log('회원가입 성공');
        client.query('INSERT INTO user(id, password) VALUES (?, ?)', [request.body.id, request.body.password], function(){
            response.cookie("uid", request.body.id, {
              expires: new Date(Date.now() + 900000),
              httpOnly: true
          });
/*
          request.session.user = {
            "name" : request.body.id
          }
*/
          response.redirect('/lobby');
        });
      } else {
        console.log('비밀번호 불일치');
        response.send('<script type="text/javascript">alert("비밀번호가 일치하지 않습니다."); document.location.href="/signup"</script>');
      }
    } else { //아이디 중복일 경우
      response.send('<script type="text/javascript"> alert("아이디가 중복입니다."); document.location.href="/signup"</script>');
      console.log('아이디 중복');
    }
  });
});

app.get('/lobby', function(request, response){
  if(request.cookies.uid){
    fs.readFile('lobby.html', 'utf8', function(error, data){
      //response.send(data.toString());
      response.send(ejs.render(data, {
        user: request.cookies.uid
      }));
    //  request.session.now = (new Date()).toUTCString();
    });
  } else {
    response.redirect('/');
  }
});

app.get('/canvas/:roomId', function (request, response){
  fs.readFile('canvas.html', 'utf8', function (error, data){
    response.send(ejs.render(data,{
      room: roomId,
      user: request.cookies.uid
    //  user: request.session.user.name
    }));
  });
});
/*
app.get('/room', function (request, response){
  var rooms = Object.keys(io.sockets.adapter.rooms).filter(function (item){
    return item.indexOf('/lobby') < 0;
  });
  response.send(rooms);
});
*/
