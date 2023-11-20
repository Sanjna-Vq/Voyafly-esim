import { generateQRCodeWithLogo } from "./WebhookContoller.js";

export const emailResend = async (req,res) => {
    let status = 200;
    let error = null;
    try {
    console.log(req.body.esim_url, req.body.mail , req.body.order_id , req.body.iccid  , req.body.bundle_name );
    await generateQRCodeWithLogo(req.body.esim_url, req.body.mail , req.body.order_id , req.body.iccid  , req.body.bundle_name );
    res.status(status).send({ success: status === 200, error , data:req.body});
    } catch (error) {
      console.error("Error:", error);
    }
};