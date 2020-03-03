# fe-tracker

## 如何运行

需要 docker 环境

### 目录说明
- `tracker-gateway`: tracker 后端网关
- `tracker-sdk`: tracker 客户端数据上报 SDK

### 运行 influx 和 grafana

`docker-compose up`

### 配置数据库

首先进入 influx 容器中, `docker exec -it fetracker_influx_1 /bin/bash`

进入 influx, `influx`

创建数据库, `create database Tracker`

### 配置 grafana

浏览器打开 `http://localhost:3000/`

用 admin / admin 登录, 修改密码先跳过

点击 "Create a data source", 数据库选择 "influxDB"

查看 influx 容器 ip, `docker network inspect fetracker_default | grep influx -A 5`, 我的是 "172.23.0.2"

回到 grafana 数据库配置, URL 那一项填 `http://172.23.0.2:8086` (注意用你上一步得到的 ip)

Database 那一项填 "Tracker"

点击 "Save & Test" 保存数据库

### 构建 SDK

进入 sdk 目录 `cd tracker-sdk`

安装依赖 `yarn`

构建 `yarn build`

### 运行后端

进入 gateway 目录 `cd traker-gateway`

安装依赖 `yarn`

运行 `yarn start`

### 打开测试页面

先装个 web server, `yarn global add http-server && http-server`

浏览器打开 `http://127.0.0.1:8080/tracker-sdk/`

查看 devtool network 和服务端 log, 应该调用了上报数据接口, 并存储数据到 influx 数据库中

### 配置 grafana 表格

回到 grafana 控制台, 创建一个 dashboard

会自动创建一个 panel, 点击 "Add Query"

点击 "select measurment" 选择 "performace" 表

点击 "field(value)" 选择要展示的数据

这时候图表就能展示出内容了, 详细图表配置可以参考 <https://grafana.com/docs/grafana/latest/features/panels/panels/#panel-overview>
