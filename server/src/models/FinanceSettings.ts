import mongoose, { Schema } from "mongoose";
const schema = new Schema({
 key:{type:String,unique:true,default:"default"}, requireMainAdminApproval:{type:Boolean,default:false}, refundApprovalThreshold:{type:Number,default:0,min:0}, defaultPayout:{type:Number,default:35,min:0}, payoutSchedule:{type:String,default:"Manual"}, incentiveThresholds:{type:[{minRating:Number,minDeliveries:Number,amount:Number}],default:[]}, permissions:{type:[String],default:[]}, updatedBy:{type:Schema.Types.ObjectId,ref:"User",default:null}
},{timestamps:true});
export default mongoose.models.FinanceSettings || mongoose.model("FinanceSettings",schema);
