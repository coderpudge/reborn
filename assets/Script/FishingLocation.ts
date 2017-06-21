

const {ccclass, property} = cc._decorator;

/**
// 钓点配置表
var cfg_Location_Table_Def = [
    id,//地点 ID
    amount, //数量
    fishType, //鱼的种类
    fishAmount, //鱼的数量区间
    fishWeight, //鱼的重量区间
]
**/

//鱼的品种
// var fishTypeDef = [
//     id, //品种 ID
//     name,//名称
//     weight, //体重区间
//     suctionFactor, //吸食力系数
//     impactFactor, //冲撞力系数
//     enduranceFactor, //耐力系数
//     caliberFactor, //口径系数
// ]



@ccclass
export  class FishingLocation  {

    static _baseConfigData = {};
    static _configCache = {};
    
    static init(){
        var configName = [
            "location",
            "fishType"
        ];
        configName.forEach(element => {
            cc.log(element);
            this.initBaseData(element);
        });
    }

    static getBaseData(df,id){
        if(!this._configCache[df] || this._baseConfigData[df] == null){
            this.CheckCfg(df);
        }
        if(id != null){
            return this._baseConfigData[df][id];
        }
    }

    static initBaseData(df){
        if(!this._configCache[df] || this._baseConfigData[df] == null){
            this.CheckCfg(df);
        }
    }
    static CheckCfg(df)
    {
        if(!this._configCache[df]){
            var me = this;
            cc.loader.load(cc.url.raw("resources/config/"+df+".json"), function (errors, results) {
                if (errors) {
                    for (var i = 0; i < errors.length; i++) {
                        cc.log('Error url [' + errors[i] + ']: ' + results.getError(errors[i]));
                    }
                }
                me._configCache[df] = true;
                me._baseConfigData[df] = results;
                cc.log(results);
            });
        }
    }

    getTableData(tableDF,table,id)
    {
        if(table[id])
        {
            var dic = {};
            for(var key in tableDF){
                dic[tableDF[key]] = table[id][key];
            }
            return dic;
        }
        return null;
    }
    getTableRowCount(table) {
        var count = 0;
        for (var k in table) {
            ++count;
        }
        return count;
    }

    createFishAIByLocation(locationId){

    }


}
