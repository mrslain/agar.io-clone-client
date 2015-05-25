module.exports = (app) ->
  app.get '/', (req, res) ->
    res.render 'index',
      title: 'Agar.io-clone Client'
