import mongoose, { Schema } from "mongoose";
export interface IUser { name:string; email:string; phone?:string; password:string; role:"customer"|"admin"|"delivery"; blocked:boolean; }
const schema = new Schema<IUser>({name:{type:String,required:true},email:{type:String,unique:true,required:true},phone:String,password:{type:String,required:true},role:{type:String,enum:["customer","admin","delivery"],default:"customer"},blocked:{type:Boolean,default:false}},{timestamps:true});
export default mongoose.model<IUser>("User",schema);