
function inside(cp1,cp2,p){
    return (cp2.x-cp1.x)*(p.y-cp1.y) > (cp2.y-cp1.y)*(p.x-cp1.x);
}

function intersection(cp1,cp2,s,e){
    let dc = cc.p(cp1.x-cp2.x, cp1.y-cp2.y);
    let dp = cc.p(s.x-e.x, s.y-e.y);
    let n1 = cp1.x*cp2.y - cp1.y*cp2.x;
    let n2 = s.x * e.y - s.y * e.x;
    let n3 = (dc.x * dp.y - dc.y * dp.x);
    return cc.p((n1*dp.x-n2*dc.x)/n3, (n1*dp.y-n2*dc.y)/n3);
}

function computeAC(vs){
    let count=vs.length;
    var c = cc.p(0,0);
    var area = 0.0;
    var p1X = 0.0;
    var p1Y = 0.0;
    var inv3 = 1.0 / 3.0;
    for (var i = 0; i < count; ++i) {
        var p2 = vs[i];
        var p3 = i + 1 < count ? vs[i + 1] : vs[0];
        var e1X = p2.x - p1X;
        var e1Y = p2.y - p1Y;
        var e2X = p3.x - p1X;
        var e2Y = p3.y - p1Y;
        var D = (e1X * e2Y - e1Y * e2X);
        var triangleArea = 0.5 * D;area += triangleArea;
        c.x += triangleArea * inv3 * (p1X + p2.x + p3.x);
        c.y += triangleArea * inv3 * (p1Y + p2.y + p3.y);
    }


    return [area,c];
}

cc.Class({
    extends: cc.Component,

    properties: {
        density:1,
        angularDrag:1,
        linearDrag:1
    },

    // use this for initialization
    onLoad: function () {
        this.createFluid();
        this.inFluid=[];
        this.physicManager=cc.find('Canvas/physicManager').getComponent('physicManager');
        this.gravity=cc.p(this.physicManager.gravity.x,-this.physicManager.gravity.y);

    },
    
    findIntersectionAreaAndCentroid(body){
        var fixtureB=body.GetFixtureList();
        if(!fixtureB||fixtureB.GetType()!==2){
            return;
        }
        var centroid=cc.p(0,0);
        var area=0;
        var mass=0;
        while(fixtureB){
            var outputList=this.getVertices(this.fluidBody);
            var clipPolygon=this.getVertices(body);
            
            var cp1=clipPolygon[clipPolygon.length-1];
            for (var j=0;j<clipPolygon.length;j++) {
                var cp2 = clipPolygon[j];
                var inputList = outputList;
                outputList = [];
                let s = inputList[inputList.length - 1]; //last on the input list
                for (var i=0;i<inputList.length;i++) {
                    var e = inputList[i];
                    if (inside(cp1,cp2,e)) {
                        if (!inside(cp1,cp2,s)) {
                            outputList.push(intersection(cp1,cp2,s,e));
                        }
                        outputList.push(e);
                    }
                    else if (inside(cp1,cp2,s)) {
                        outputList.push(intersection(cp1,cp2,s,e));
                    }
                    s = e;
                }
                cp1 = cp2;
            }
            let ac=computeAC(outputList);
            var density=fixtureB.GetDensity();
            mass+=ac[0]*density;
            area+=ac[0];

            //centroid.addSelf(ac[1].mul(density));
            centroid.x+=ac[1].x*density;
            centroid.y+=ac[1].y*density;
            fixtureB=fixtureB.GetNext();
        }

        centroid.mulSelf(1/mass);

        return [area,centroid];
        
    },

    createFluid(){
        var body=this.node.addComponent(cc.RigidBody);
        body.type=0;
        body.enabledContactListener=true;
        var polygonCollider=this.node.addComponent(cc.PhysicsPolygonCollider);
        var w=this.node.width/2;
        var h=this.node.height/2;
        polygonCollider.points=[cc.p(-w,-h),cc.p(w,-h),cc.p(w,h),cc.p(-w,h)];
        polygonCollider.sensor=true;
        polygonCollider.density=this.density;
        polygonCollider.apply();
        this.fluidBody=body._b2Body;
    },



    onBeginContact(contact, selfCollider, otherCollider) {
        let bodyB=otherCollider.body._b2Body;
        this.inFluid.push(bodyB);
        contact.disabled = true;
    },

    onEndContact(contact,selfCollider,otherCollider){
        let bodyB=otherCollider.body._b2Body;
        let index=this.inFluid.indexOf(bodyB);
        this.inFluid.splice(index,1);
        contact.disabled = true;
    },

    applyBuoyancy(body){
        var AC=this.findIntersectionAreaAndCentroid(body);//get the area and centroid
        if(AC[0]!==0){
            var mass=AC[0]*this.density;
            var centroid=AC[1];
            var buoyancyForce=new b2.Vec2(mass*this.gravity.x,mass*this.gravity.y);
            body.ApplyForce(buoyancyForce,centroid);
            var velDir=body.GetLinearVelocityFromWorldPoint(centroid).Subtract(this.fluidBody.GetLinearVelocityFromWorldPoint(centroid));
            var dragMag=this.density*this.linearDrag*mass;
            var dragForce=velDir.Multiply(-dragMag);
            body.ApplyForce(dragForce,centroid);

            var torque=-body.GetInertia()/body.GetMass()*mass*body.GetAngularVelocity()*this.angularDrag;
            body.ApplyTorque(torque);
        }
        
    },


    getVertices(body){
        var shape=body.GetFixtureList().GetShape();
        var vertices=[];
        for(var i=0;i<shape.GetVertexCount();i++){
            vertices.push(body.GetWorldPoint(shape.GetVertex(i)));
        }
        return vertices;
    },


    // called every frame, uncomment this function to activate update callback
    update: function (dt) {
        for(var i=0,l=this.inFluid.length;i<l;i++){
            this.applyBuoyancy(this.inFluid[i]);
        }
    },
});
