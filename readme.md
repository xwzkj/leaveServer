# 请假服务器

为[奶酪课程表](https://github.com/xwzkj/cheeseschedule)出席人数小组件提供的后端服务

## 环境变量

可放在.env文件中

HOSTNAME=主机名
PORT=端口
API_KEY=密钥
CLASS_TOTAL_STUDENTS=总学生数

## 接口

请求时在Authorization header中传入Bearer+空格+key

/studentCount get请求 获取学生数量信息
返回值为{total,actual,leave}

/get get请求 获取记录
返回值为请假人列表

/add post请求 添加记录
请求体携带Leave对象
返回值同/get

/remove get请求 删除记录
参数 name 传入要删除的姓名
返回值同/get

## 前端页面

访问/，在query中传入key，即可进入

## 自动更新数据

建议搭配[getWeiXinMsgToLeaveServer](https://github.com/xwzkj/getWeiXinMsgToLeaveServer)使用，从windows微信自动获取请假信息
