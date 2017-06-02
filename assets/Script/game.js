import fishData from "./config/fish.js";
import {eatAnimData} from "./config/eatAnim.js"

const {ccclass, property} = cc._decorator;

@ccclass
export default class game extends cc.Component {
    @property(cc.Node)
    canvas = null;
    @property(cc.Animation)
    rob = null;
    @property(cc.RigidBody)
    buoy = null;
    @property(cc.RigidBody)
    sinker = null;
    @property(cc.RigidBody)
    hook = null;
    @property(cc.Node)
    water = null;
    @property(cc.Label)
    tips = null;
    @property(cc.Animation)
    fishAnim = null;
    @property(cc.Node)
    nodes = [];


    @property(cc.AnimationState)
    _animState = null;
    @property
    _robState = 0;
    @property
    _buoyPos = cc.v2();
    @property
    _sinkerPos = cc.v2();
    @property
    _hookPos = cc.v2();
    @property
    _forceTime = 0;
    @property
    _data = [];
    @property
    _dataIdx = null;
    @property
    _dataObj = null;


    onLoad(){
        this._buoyPos = this.buoy.node.position;
        this._sinkerPos = this.sinker.node.position;
        this._hookPos = this.hook.node.position;
        var self = this;
        //触摸监听鱼竿操作
        self.canvas.on(cc.Node.EventType.TOUCH_START, function (event) {
            var touches = event.getTouches();
            var touchLoc = touches[0].getLocation();
            // cc.log(touchLoc);
            self.robControl();
        }, self);
        self.rob.on('finished',  self.onFinished,self);
        /**
         * test
         */
        // self.onRegisteredEvent();
    }
    /**
     * 鱼竿操作
     */
    robControl(){
        // this.updateFluidArea(100);
        this.hook.node.stopAllActions();
        if(this._robState == 0){
            cc.log("push")
            this.push();
            this._robState = 1;
        }else if (this._robState == 1) {
            cc.log("pull")
            this.pull();
            this._robState = 0;
        }
    }
    /**
     * 抛竿
     */
    push(){
        this._animState = this.rob.play("pushRob"); 
    }
    /**
     * 起竿
     */
    pull(){
        this.showHook(false);
        // this.physicSwitch(false);
        var rdm = Math.random()*100;
        cc.log(rdm);
        if(rdm <= this._dataObj.probability){
            this.getFish();
        }else{
            this.getNoFish();
        }
    }
    getFish(){
        this._animState = this.rob.play("pullRobGetFish");
    }
    getNoFish(){
        this._animState = this.rob.play("pullRobNoFish");
    }
    
    /**
     * 动画播放完成
     */
    onFinished(){
        var key = this._animState.name;
        cc.log("onFinished",key)
        switch (key) {
            case "pushRob":
                this.showHook(false);
                this.resetHook();
                // this.physicSwitch(true);
                this.eat(1);
                break;
            case "pullRobGetFish":
                this.tips.string = "catch fish !";
                this.fishAnim.playAdditive("fishInBasket");
                var fishType = this.getFishData();
                this.createFishJumpClip(fishType.name,fishType.frames);
                break;
            case "pullRobNoFish":
                this.tips.string = "fish going !";
                break;
            default:
                break;
        }
    }
    /**
     * 重置线组状态
     */
    resetHook(){
        this._dataIdx = 0;
        this._dataObj = null;
        this._forceTime = 0;
        
        this.buoy.node.position = this._buoyPos;
        this.sinker.node.position = this._sinkerPos;
        this.hook.node.position = this._hookPos;
        //随机位置
        var rdmx = Math.random()*200 - 100;
        this.buoy.node.x = rdmx;
        this.sinker.node.x = rdmx;
        this.hook.node.x = rdmx;

        this.showHook(true)
    }
    /**
     * 显示隐藏线组
     * @param {*状态} flag 
     */
    showHook(flag){
        if(flag){
            this.buoy.node.opacity = 255;
            this.sinker.node.opacity = 255;
            this.hook.node.opacity = 255;
            
        }else{
            this.buoy.node.opacity = 0;
            this.sinker.node.opacity = 0;
            this.hook.node.opacity = 0;
        }
    }

    /**
     * 物理引擎开关
     * @param {*开关} flag 
     */
    physicSwitch(flag){
        let physicsManager = cc.director.getPhysicsManager();
        physicsManager.enabled = flag;
    }
    /**
     * 模仿鱼吃钩效果
     */
    eat(key){
        // var hookPos = this.hook.getWorldPosition();
        // var forceType = 1;
        this._data = this.getEatAnimData();
        var vector = cc.v2(-100,-100);
        switch (key) {
            case 1:
                var seqArray = [];
                for(let obj of this._data){
                    // this._dataIdx = index;
                    // this._dataObj = obj;

                    let setIdxFunc = cc.callFunc(this.setDataIdx, this);
                    seqArray.push(setIdxFunc);

                    let delay = cc.delayTime(obj.delay);
                    seqArray.push(delay);
                   
                }
                var seq = cc.sequence(seqArray);
                this.hook.node.runAction(seq);
                //在刚体上施加vector压力。
                //body.GetWorldCenter()方法用来获取刚体的重心
                // this.hook.applyForce(cc.v2(0,-800), this.hook.getWorldCenter());
                break;
            case 2:
                //为刚体添加速度
                this.hook.applyLinearImpulse(cc.v2(-800,-800), this.hook.getWorldCenter());
                break;
            case 3:
                //唤醒刚体
                // this.hook.wakeUp();
                //设置刚体的线性速度
                this.hook.linearVelocity = vector;
                break;
        }			
    }
    /**
     * 设置当前鱼吃钩动作索引
     */
    setDataIdx(){
        this._dataIdx = this._dataIdx || 0;
        cc.log("setIdx:",this._dataIdx);
        this._dataObj = this._data[this._dataIdx];
        this._forceTime = this._dataObj.delay;
        this.tips.string = "第"+(this._dataIdx+1)+"组动作,持续"+this._dataObj.delay+"秒，抓住鱼的概率为"+this._dataObj.probability;
        if(this._dataIdx < this._data.length - 1){
            this._dataIdx += 1;
        }
    }

    /**
     * 获取随机鱼品种的数据
     */
    getFishData(){
        var rdm = this.getRandomInt(0,fishData.length-1);
        return fishData[rdm];
    }
    /**
     * 获取随机 鱼咬钩动作的数据
     */
     getEatAnimData(){
         var rdm = this.getRandomInt(0,eatAnimData.length-1);
        return eatAnimData[rdm];
     }
     /**
      * 返回一个介于min和max之间的整型随机数
      * @param {*最小值} min 
      * @param {*最大值} max 
      */
     getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
     }

    /**
     * 创建动画
     */
    createFishJumpClip(name,count){
        var animation = this.fishAnim.getComponent(cc.Animation);
        cc.loader.loadRes(name, cc.SpriteAtlas, (err, atlas) => {
            var spriteFrames = atlas.getSpriteFrames();
            var clip = cc.AnimationClip.createWithSpriteFrames(spriteFrames, count);
            clip.name = 'fishJump';
            clip.wrapMode = cc.WrapMode.Loop;

            animation.addClip(clip);
            animation.playAdditive('fishJump');
        });
    }
    /**
     * 
     * @param {*渔具类型：鱼竿 鱼漂 铅坠 鱼钩} gearType 
     * @param {*渔具ID：光威鱼竿ID 达亿瓦鱼竿ID 伊豆鱼钩4#ID} gearId 
     */
    changeGear(gearType,gearId){

    }
    /**
     * 增加铅坠重量 （更改铅坠体积宽度）
     * @param {*增加重量} weight 
     */
    changeSinker(weight){

    }
    /**
     * 通过更改浮力水面的高度 实现甩竿远近
     * @param {*浮力水面的高度} height 
     */
    updateFluidArea(height){
        this.water.height = height;
        // this.water.setContentSize(this.water.width, height);
    }
    update(dt) {
        if (this._forceTime > 0) {
            cc.log("move");
            this._forceTime -= dt;
            this.hook.applyForce(cc.v2(this._dataObj.x, this._dataObj.y), this.hook.getWorldCenter());
        }
    }
    /**
     * test function
     */
    // onRegisteredEvent() {
    //     for (var i = 0; i < this.nodes.length; ++i) {
    //         this.nodes[i].on(cc.Node.EventType.TOUCH_END, this.onButtonEnter.bind(this));
    //     }
    // }

    // onButtonEnter(event) {
    //     switch (event.target._name) {
    //         case "f1":
    //             this.eat(1);
    //             break;
    //         case "f2":
    //             this.eat(2);
    //             break;
    //         case "f3":
    //             this.eat(3);    
    //             break;
    //     }
    // }
}
