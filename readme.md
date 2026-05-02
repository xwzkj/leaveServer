# 请假服务器

请求时在Authorization header中传入Bearer+空格+key

/get get请求 获取记录

/add post请求 添加记录
请求体携带Leave对象

/remove get请求 删除记录
参数 name 传入要删除的姓名
