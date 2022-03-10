/**
 * -------Import all classes and packages -------------
 */
import nodemailer from 'nodemailer';
import configContainer from '../config/localhost';
import logger from './logger';

let config = configContainer.loadConfig();

let dispatcher = nodemailer.createTransport(config.emailSenderOptions);
let mailOptions = config.emailOptions;

function sendEmail(options) {
    mailOptions.subject = options.subject;
    mailOptions.to = options.to;
    mailOptions.html = options.html;
    dispatcher.sendMail(mailOptions)
        .then((info) => {
            //logger.info('Email sent: ' + info.response);
        })
        .catch((error) => {
            logger.error(error);
        });
}

module.exports = {
    sendEmail: sendEmail,
}