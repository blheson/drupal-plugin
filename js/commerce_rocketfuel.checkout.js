class getPaidSetup{
    constructor(options) {
        this.merchantAuth = options.merchant_auth
        this.amount = options.amount
        this.email = options.customer_email
        this.lastname = options.customer_lastname
        this.firstname = options.customer_firstname
        this.uuid = options.uuid
        this.endpoint = options.endpoint
        this.environment = options.environment
        this.rkfl = new RocketFuel({
            environment: options.environment
        });

        localStorage.setItem('notifyUrl', options.notifyUrl);
        localStorage.setItem('payment_id', options.payment_id);
        console.log(options)
    }

    async init() {
        try {
            await this.initRocketFuel();

        } catch (error) {

            console.log('error from promise', error);

        }

        console.log('Done initiating RKFL');

        this.windowListener();

        if (document.getElementById('rocketfuel_retrigger_payment_button')) {
            document.getElementById('rocketfuel_retrigger_payment_button').addEventListener('click', () => {
                this.startPayment(false);
            });
        }

        this.startPayment();

    }

    async initRocketFuel() {
        return new Promise(async (resolve, reject) => {
            if (!RocketFuel) {
                location.reload();
                reject();
            }

            let payload, response, rkflToken;


            if (this.firstname && this.email && this.merchantAuth) {
                payload = {
                    firstName: this.firstname,
                    lastName: this.lastname,
                    email: this.email,
                    merchantAuth: this.merchantAuth,
                    kycType: 'null',
                    kycDetails: {
                        'DOB': "01-01-1990"
                    }
                }


                try {
                    if (this.email !== localStorage.getItem('rkfl_email')) { //remove signon details when email is different
                        localStorage.removeItem('rkfl_token');
                        localStorage.removeItem('access');

                    }
                    rkflToken = localStorage.getItem('rkfl_token');

                    if (!rkflToken) {

                        //use this.environement when it is correct
                        response = await this.rkfl.rkflAutoSignUp(payload, this.environment);

                        this.setLocalStorage('rkfl_email', this.email);

                        if (response) {

                            rkflToken = response.result?.rkflToken;

                        }

                    }

                    const rkflConfig = {
                        uuid: this.uuid,
                        callback: this.updateOrder,
                        //use this.environement when it is correct
                        environment: this.environment,
                    }
                    if (rkflToken) {
                        rkflConfig.token = rkflToken;
                    }

                    console.log({rkflConfig});

                    this.rkfl = new RocketFuel(rkflConfig);

                    resolve(true);

                } catch (error) {

                    reject();

                }

            }
            resolve('no auto');
        })

    }

    setLocalStorage(key,value){
        localStorage.setItem(key,value);
    }

    updateOrder(result) {
        try {
            let result_status = String(result.status);
            let payment_mode = String(result.paymentMode);

            let fd = new FormData();
            fd.append("status", result_status);
            fd.append("mode", payment_mode);
            fd.append("payment_id", String(localStorage.getItem('payment_id')));
            fetch(String(localStorage.getItem('notifyUrl')), {
                method: "POST",
                body: fd,
                mode: 'no-cors',
                redirect: 'follow'
            }).then(res => res.text()).then(result => {
                console.log(result)

            }).catch(e => {
                console.log(e)

            })
        } catch (error) {

        }

    }

    startPayment(autoTriggerState = true) {

        if (!autoTriggerState) {
            document.getElementById('rocketfuel_retrigger_payment_button').innerText = "Preparing Payment window...";
            this.watchIframeShow = true;
        }

        // document.getElementById('rocketfuel_retrigger_payment_button').disabled = true;

        let checkIframe = setInterval(() => {

            if (this.rkfl.iframeInfo.iframe) {
                this.rkfl.initPayment();
                clearInterval(checkIframe);
            }

        }, 500);

    }

    windowListener() {
        window.addEventListener('message', (event) => {

            switch (event.data.type) {
                case 'rocketfuel_iframe_close':
                    //todo trigger the onClose
                    break;
                case 'rocketfuel_new_height':
                    if (this.watchIframeShow) {
                        this.prepareProgressMessage();
                        this.watchIframeShow = false;

                    }
                    break;
                default:
                    break;
            }

        })
    }

    prepareProgressMessage() {

        //hide retrigger button
        document.getElementById('rocketfuel_retrigger_payment_button').innerText = "Resume"; //revert trigger button message

        document.getElementById('rocketfuel_retrigger_payment').style.display = 'none';
        document.getElementById('rocketfuel_before_payment').style.display = 'block';

    }
}

(function ($, Drupal, drupalSettings) {
    'use strict';

    Drupal.behaviors.rocketForm = {
        attach: function (context) {
            var data = drupalSettings.rocketfuel;
            // Your custom JavaScript code
            const pay = new getPaidSetup(JSON.parse(data));
            pay.init()

            return false
        }

    };

}(jQuery, Drupal, drupalSettings));