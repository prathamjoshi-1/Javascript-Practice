function checkdriving(){
        let age=document.querySelector('#age').value;

       let message=age>=18?"You Can Drive":"You Cannot Drive";
        document.querySelector('#result').innerText=message;
    }
