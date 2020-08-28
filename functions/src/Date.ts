export function DATE(time:any) {
    var year = new Date(time).toLocaleString('en-us', {
        year: 'numeric',
        timeZone: 'Asia/Taipei' // 台灣台北
      })
    var month = new Date(time).toLocaleString('en-us', {
        month: 'numeric',    
        timeZone: 'Asia/Taipei' // 台灣台北
      })
    var day = new Date(time).toLocaleString('en-us', {
        day: 'numeric',    //(e.g., 1)
        timeZone: 'Asia/Taipei' // 台灣台北
      })
    var hour = new Date(time).toLocaleString('en-us', {
        hour: '2-digit',   //(e.g., 02)       
        hour12: false,     // 24 小時制
        timeZone: 'Asia/Taipei' // 台灣台北
      })
    var min = new Date(time).toLocaleString('en-us', {
        minute: '2-digit', //(e.g., 02)          
        hour12: false,     // 24 小時制
        timeZone: 'Asia/Taipei' // 台灣台北
      })
    
    var date:any = {
        nowdate : `${year}${month}${day}`,
        year : year,
        month : month,
        day : day,
        hour : hour,
        min : min
    }
    return date
}

