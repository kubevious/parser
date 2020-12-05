module.exports = ({router, app, logger, context}) => {

    router.get('/', function (req, res) {
        res.send({});
    });

    router.get('/api/v1/version', function (req, res) {
        res.send({
            version: require('../../version')
        });
    });

    app.use('/', router);
};