const moment = require('moment');

function UploadRouteHandler(pool) {
  this.pool = pool;
  
  this.getUploadLogs = (req, res) => {
    const statement = "SELECT filename, status, approver, remarks FROM uploads WHERE filename NOT LIKE '%FAILED' ORDER BY timestamp DESC LIMIT 100";

    return this.pool.query(statement)
      .then(result => {
        const payload = [];

        for (const row of result.rows) {
          const filenameSplit = row.filename.split('-');
          const timestamp = filenameSplit[0];
          const idol = filenameSplit[1];
          const source = filenameSplit[2].split('.')[0];

          payload.push({
            idol: idol,
            source: source,
            date: moment(timestamp, 'YYYYMMDDHHmmssSSS').format('YYYY-MM-DD HH:mm:ss') + "Z",
            status: row.status,
            remarks: row.remarks,
            approver: row.approver
          });
        }

        res.set('Content-Type', 'application/json');
        return res.send(payload);
      })
      .catch(err => {
        console.error(err);
        res.status(500);
        return res.end();
      });
  };
}

module.exports = UploadRouteHandler;