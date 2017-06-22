const {ccclass, property} = cc._decorator;

@ccclass
export  class Utils {

      /**
      * 返回一个介于min和max之间的整型随机数
      * @param {*最小值} min 
      * @param {*最大值} max 
      */
     static getRandomInt(min, max) {
            return Math.floor(Math.random() * (max - min + 1) + min);
     }
     static clone(obj) {  
            var o;  
            if (typeof obj == "object") {  
                  if (obj === null) {  
                        o = null;  
                  } else {  
                        if (obj instanceof Array) {  
                        o = [];  
                        for (var i = 0, len = obj.length; i < len; i++) {  
                              o.push(this.clone(obj[i]));  
                        }  
                        } else {  
                        o = {};  
                        for (var j in obj) {  
                              o[j] = this.clone(obj[j]);  
                        }  
                        }  
                  }  
            } else {  
                  o = obj;  
            }  
            return o;  
      }  
}
