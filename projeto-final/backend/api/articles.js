const queries = require("./queries.js")

module.exports = app => {
    const { existOrError } = app.api.validation

    const save = (req, res) => {
        const article  = { ...req.body}
        if(req.params.id) article.id = req.params.id

        try {
            existOrError(article.name,"Nome não informado")
            existOrError(article.description,"Descrição não informada")
            existOrError(article.categoryId,"Categoria não informada")
            existOrError(article.userId,"Autor não informado")
            existOrError(article.content,"Conteúdo não informado")
        }  catch(msg) {
            res.status(400).send(msg)
        }

        if(article.id) {
            app.db('articles')
                .update( article)
                .where( {id:article.id })
                .then( _ => res.status(204).send())
                .catch( err => res.status(500).send(err))
        }  else  {
            app.db('articles')
                .insert(article)
                .then( _ => res.status(204).send() )
                .catch( err => res.status(500).send(err))
        }
    }

    const remove = async (req, res) => {
        try {
            const rowsDeleted = await app.db('articles')
                .where({id: req.params.id}).del()
           try{
            existOrError(rowsDeleted, 'Artigo não foi encontrado')
           }  catch(msg) {
             return res.status(400).send(msg)
           }
           res.status(204).send()
        }  catch(msg) {
            res.status(500).send(msg)
        }
    }

    const limitRows = 10
    const get = async (req, res) => {
        const page = req.query.page || 1

        const result = await app.db('articles').count('id').first()
        const count = parseInt(result.count)

        app.db('articles')
            .select('id', 'name', 'description')
            .limit(limitRows).offset(page * limitRows - limitRows)
            .then(articles => res.json({data: articles, count, limitRows}))
            .catch(err => res.status(500).send(err))
    }

    const getById = async (req, res) => { 
        app.db('articles')
            .where({ id: req.params.id })
            .first()
            .then(article => {
                article.content = article.content.toString()
                return res.json(article)
            })
            .catch(err => res.status(500).send(err))

    }

    const getByCategory = async (req, res) => {
        const categoryId  = req.params.id
        const page = req.query.page || 1
        const categories  = await app.db.raw(queries.categoryWithChildren, categoryId)
        const ids = categories.rows.map( c=> c.id )

        app.db({a: 'articles', u: 'users'})
            .select('a.id', 'a.name', 'a.description', 'a.imageUrl', {author: 'u.name'})
            .limit(limitRows).offset( page * limitRows - limitRows)
            .whereRaw('?? = ??', ['u.id', 'a.userId'])
            .whereIn('categoryId', ids)
            .orderBy('a.id', 'desc')
            .then(articles => res.json(articles))
            .catch(err => res.status(500).send(err))

    }
    return { save, remove, get, getById, getByCategory }
}