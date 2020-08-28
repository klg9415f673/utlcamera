type cardatatype ={
    imageUrl: string;                                       // 從 storage 取得的 url
    update_time: string;                                    // 上傳時間
    time: number;                                           //上傳時間timestamp格式
    ID:string;                                              //資料名稱
}



export class cardata  {
    imageUrl: string;                                       
    update_time: string;                                  
    time: number;
    ID?:string;

    constructor(type : cardatatype) {
        this.imageUrl = type.imageUrl;
        this.update_time = type.update_time;
        this.time = type.time;
        this.ID = type.ID;
    }
}