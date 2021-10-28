


var day =  Math.floor(Number(21885730)/1000 / 60 / 60 / 24)
var hr  = Math.floor(Number(21885730)/1000 / 60 / 60 -day*24)
var min = Math.floor(Number(21885730)/1000 / 60) -(hr+day*24)*60
var sec = Math.floor(Number(21885730)/1000)-(min+(hr+day*24)*60)*60
var msg = `ParkingTime:${day}天${hr}時${min}分${sec}秒`

console.log(msg)