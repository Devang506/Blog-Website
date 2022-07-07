
module.exports.getDate = getDate; // it will be sent this to where this module get called
function getDate(){
var today  =new Date();
var options ={

     day : "numeric",
     month : "long",
     year: 'numeric'
}
var day = today.toLocaleDateString("en-us",options);
return day;

}
module.exports.getDay = getDay;
function getDay(){
var today  =new Date();
var options ={
     weekday :"long",

}
var day = today.toLocaleDateString("en-us",options);
return day;
}
