type cardatatype ={
    imageUrl: string;                                       // 從 storage 取得的 url
    licenseplate:string;
    status:boolean;
    recognizetime:string;
}



export class cardata  {
    imageUrl: string;  
    licenseplate:string;    
    status:boolean; 
    recognizetime:string;                            
   

    constructor(type : cardatatype) {
        this.imageUrl = type.imageUrl;
        this.licenseplate = type.licenseplate;
        this.status = type.status;
        this.recognizetime = type.recognizetime;
       
    }
}