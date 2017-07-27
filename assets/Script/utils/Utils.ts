const { ccclass, property } = cc._decorator;

@ccclass
export class Utils {

      /**
      * 返回一个介于min和max之间的整型随机数
      * @param {*最小值} min 
      * @param {*最大值} max 
      */
      static getRandomInt(min, max) {
            if (max == undefined) {
                  return Math.floor(Math.random() * (max - min + 1) + min);

            } else {
                  return Math.floor(Math.random() * (max - min + 1) + min);
            }
      }
      
      /**
       * 返回一个介于min和max之间的随机数
       * @param min 
       * @param max 
       */
      static getRandomArbitrary(min, max) {
            if (max == undefined) {
                  return Math.random() * (max - 0) + 0;
            } else {
                  return Math.random() * (max - min) + min;
            }

      }
      /**
       * 克隆对象
       * @param obj 
       */
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

/**
 * ======================string 字符串处理 分割=================
 */
      /** 
      * 字符串处理函数 
      */ 
      // static StringBuffer() { 
      //       var arr = new Array; 
      //       this.append = function(str) { 
      //             arr[arr.length] = str; 
      //       }; 

      //       this.toString = function() { 
      //             return arr.join("");//把append进来的数组ping成一个字符串 
      //       }; 
      // } 

      
      /** 
      *把数组转换成特定符号分割的字符串 
      */ 
      static arrayToString(arr,separator) { 
            if(!separator) separator = "";//separator为null则默认为空 
            return arr.join(separator); 
      } 

      /** 
      * 查找数组包含的字符串 
      */ 
      static arrayFindString(arr,string) { 
            var str = arr.join(""); 
            return str.indexOf(string); 
      } 

      static sleep(time){
            cc.log("sleep ...");
            var start = Date.now();
            while(Date.now() - start < time * 1000) { // delay 1 sec
                ;
            }
      }
}
