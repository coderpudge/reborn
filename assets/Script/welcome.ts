import { DataManager } from './game/DataManager';
// import { DataManager } from './game/DataManager';
const {ccclass, property} = cc._decorator;


@ccclass
export default class Welcome extends cc.Component {
    _enter = false;
    onLoad() {
        // init logic
        DataManager.init();
    }
    update(){
        if(DataManager.isLoadConfig() && !this._enter){
            this._enter = true;
            cc.director.preloadScene("game", function () {
                cc.log("Next scene preloaded");
                cc.director.loadScene("game");
            });
        }
    }
}
