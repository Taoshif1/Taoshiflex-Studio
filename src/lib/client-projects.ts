export const clientProjectStatuses=["planning","active","client_review","on_hold","completed","cancelled"] as const;
export const milestoneStatuses=["pending","in_progress","client_review","completed"] as const;
export const deliverableStatuses=["preparing","ready_for_review","approved","delivered"] as const;
export type ClientProjectStatus=typeof clientProjectStatuses[number];
export type MilestoneStatus=typeof milestoneStatuses[number];
export type DeliverableStatus=typeof deliverableStatuses[number];
export type ClientProject={id:string;reference:string;source_inquiry_id?:string|null;name:string;client_name:string;summary:string;status:ClientProjectStatus;progress:number;current_phase:string;next_action:string;start_date?:string|null;target_date?:string|null;created_at:string;updated_at:string};
export type ClientProjectMember={id:string;project_id:string;user_id:string;email:string;role:"client"|"studio";created_at:string};
export type ProjectMilestone={id:string;project_id:string;title:string;description:string;status:MilestoneStatus;due_date?:string|null;completed_at?:string|null;sort_order:number;created_at:string;updated_at:string};
export type ProjectUpdate={id:string;project_id:string;title:string;body:string;published_at:string;created_at:string;updated_at:string};
export type ProjectDeliverable={id:string;project_id:string;title:string;description:string;status:DeliverableStatus;external_url?:string|null;created_at:string;updated_at:string};
const labels:Record<string,string>={planning:"Planning",active:"In Progress",client_review:"Awaiting Your Review",on_hold:"On Hold",completed:"Completed",cancelled:"Cancelled",pending:"Pending",in_progress:"In Progress",preparing:"Preparing",ready_for_review:"Ready for Review",approved:"Approved",delivered:"Delivered"};
export function statusLabel(status:string){return labels[status]??status.replaceAll("_"," ").replace(/\b\w/g,value=>value.toUpperCase())}
export function formatProjectDate(value?:string|null){return value?new Intl.DateTimeFormat("en-BD",{dateStyle:"medium",timeZone:"Asia/Dhaka"}).format(new Date(value)):"Not scheduled"}
