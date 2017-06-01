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
    nodes = [];
    @property(cc.Label)
    tips = null;


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
        self.onRegisteredEvent();
    }
    /**
     * 鱼竿操作
     */
    robControl(){
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
                // var node = cc.Node();
                // node.position = this.buoy.node.position;

                this.createClip();
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
        this.showHook(true)
    }
    /**
     * 显示隐藏线组
     * @param {*状态} flag 
     */
    showHook(flag){
        this.buoy.node.active = flag;
        this.sinker.node.active = flag;
        this.hook.node.active = flag;
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
        this._data = [
                    {x:0,y:0, delay: 10, probability:0 },
                    {x:0,y:-800, delay: 5, probability:10 },
                    {x:0,y:40, delay: 5, probability:0 },
                    {x:0,y:-800, delay: 8, probability:20 },
                    {x:0,y:30, delay: 6, probability:0 },
                    {x:0,y:-800, delay:6, probability:80 },
                    {x:0,y:90, delay:2, probability:0 },
                    {x:0,y:-1000, delay:9, probability:100 },
                    {x:0,y:80, delay:5, probability:100 },
                ];
        var vector = cc.v2(-100,-100);
        // var key = 1
        cc.log(key)
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
                this.hook.applyForce(cc.v2(0,-800), this.hook.getWorldCenter());
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
    setDataIdx(idx){
        this._dataIdx = this._dataIdx || 0;
        cc.log("setIdx:",this._dataIdx);
        this._dataObj = this._data[this._dataIdx];
        this._forceTime = this._dataObj.delay;
        this.tips.string = "第"+(this._dataIdx+1)+"组动作,持续"+this._dataObj.delay+"秒，抓住鱼的概率为"+this._dataObj.probability;
        if(this._dataIdx < this._data.length - 1){
            this._dataIdx += 1;
        }
    }
    onRegisteredEvent() {
        for (var i = 0; i < this.nodes.length; ++i) {
            this.nodes[i].on(cc.Node.EventType.TOUCH_END, this.onButtonEnter.bind(this));
        }
    }

    onButtonEnter(event) {
        switch (event.target._name) {
            case "f1":
                this.eat(1);
                break;
            case "f2":
                this.eat(2);
                break;
            case "f3":
                this.eat(3);    
                break;
        }
    }
    /**
     * 创建动画
     */
    createClip(){
        var animation = this.hook.getComponent(cc.Animation);
        cc.loader.loadRes("fish/baitiao/baitiao", cc.SpriteAtlas, (err, atlas) => {
            var spriteFrames = atlas.getSpriteFrames();
            
            var clip = cc.AnimationClip.createWithSpriteFrames(spriteFrames, 4);
            clip.name = 'run';
            clip.wrapMode = cc.WrapMode.Loop;

            animation.addClip(clip);
            animation.play('run');
        });
    }

    update(dt) {
        if (this._forceTime > 0) {
            cc.log("move");
            this._forceTime -= dt;
            this.hook.applyForce(cc.v2(this._dataObj.x, this._dataObj.y), this.hook.getWorldCenter());
        }
    }
}
