function RankingRouteHandler(pool) {
  this.pool = pool;
  
  this.getRanking = (req, res) => {
    const statement =
      `SELECT
        CASE
          WHEN users.anonymous = true THEN NULL ELSE users.twitter_username
        END username,
        verified_uploads.total 
      FROM users
      INNER JOIN
        (
          SELECT twitter_id, COUNT(*) AS total
          FROM uploads
          WHERE status = 'approved' AND twitter_id IS NOT NULL
          GROUP BY(twitter_id)
        ) verified_uploads
      ON users.twitter_id = verified_uploads.twitter_id
      WHERE users.ranking = true
      ORDER BY total DESC
      LIMIT 100`;

    return this.pool.query(statement)
      .then(result => {
        const rows = result.rows;

        return res.send(rows);
      })
      .catch(err => {
        console.error(err);
        res.status(500);
        return res.end();
      });
  };
}

module.exports = RankingRouteHandler;