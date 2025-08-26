
        let age=7;
        let gender='male'; // Male and Female
        let finalDiscount;

        if(age<=5){
            finalDiscount=100;
        }
        else if(gender==='female'|| age<=8){
            finalDiscount=50;
        }
        else if(age>=65){
            finalDiscount=30;
        }else{
            finalDiscount=0;
        }

        console.log(`Your Final Discount is ${finalDiscount} %`);
  
