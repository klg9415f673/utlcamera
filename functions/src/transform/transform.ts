export function hex2string(hexx:any) {    //hex 轉 ascii  ex: 41 => a
    var hex = hexx.toString();
    var str = '';
    for (var i = 0; (i < hex.length && hex.toString().substr(i, 2) !== '00'); i += 2){
        str += String.fromCharCode(parseInt(hex.toString().substr(i, 2), 16));
    }
    return str;
}

export function hex2Decimal(hexx:any) {   //hex 轉 dec , ex:  16 => 22  , 1111 => 17 17
    var hex = hexx.toString();
    var str = '';
    for (var i = 0; (i < hex.length); i += 2)
        str += parseInt(hex.toString().substr(i, 2), 16);
    return str;
}

export function hex2int16(hexx:any){  //hex 轉 int16 , 
    var hex = hexx.toString();
    var str = '';
    var num ;
    for (var i = 0; (i < hex.length); i += 4)
        str += parseInt(hex.toString().substr(i, 4), 16);
    
    num = parseInt(str)
    if (num>32767)
      num = num - 65536

    return num; 
}

export function hex2uint16(hexx:any){  //hex 轉 uint16 , 
    var hex = hexx.toString();
    var str = '';
    var num ;
    for (var i = 0; (i < hex.length); i += 4)
        str += parseInt(hex.toString().substr(i, 4), 16);
    
    num = parseInt(str)
   

    return num; 
}


export function hex2int8(hexx){  //hex 轉 int8 , 
    var hex = hexx.toString();
    var str = '';
    var num ;
    for (var i = 0; (i < hex.length); i += 4)
        str += parseInt(hex.toString().substr(i, 4), 16);
    
    num = parseInt(str)
    if (num>128)
      num = num - 256

    return num; 



}

export function hex2uint8(hexx){  //hex 轉 uint8 , 
    var hex = hexx.toString();
    var str = '';
    var num ;
    for (var i = 0; (i < hex.length); i += 4)
        str += parseInt(hex.toString().substr(i, 4), 16);
    
    num = parseInt(str)

    return num; 

}

export function hex2Decimal4(hexx:any) {  //hex 轉 dec , ex:  1111 =>4369
    var hex = hexx.toString();
    var str = parseInt(hex.toString().substr(0, 4), 16);
    return str;
}

export function stringToHex(str:any) {
    var hex: number[] = [];
    for (var i = 0; i < str.length; i += 2) {
        var temp = str.substr(i, 2);
        // console.log("temp1 => ", temp)
        var temp2 = parseInt(temp, 16);
        // console.log("temp2 => ",temp2)
        hex.push(temp2);
    }
    // console.log(hex)
    return hex
}