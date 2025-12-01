const InstitutionService = require('../services/InstitutionService');

class InstitutionController {
    async getAll(req, res, next) {
        try {
            const institutions = await InstitutionService.getAllInstitutions();
            res.json({ success: true, data: institutions });
        } catch (error) {
            next(error);
        }
    }

    async create(req, res, next) {
        try {
            // Basit validasyon
            if (!req.body.name) {
                return res.status(400).json({ success: false, message: 'Kurum adı zorunludur.' });
            }

            const institution = await InstitutionService.createInstitution(req.body);
            res.status(201).json({ success: true, data: institution });
        } catch (error) {
            next(error);
        }
    }

    async update(req, res, next) {
        try {
            const institution = await InstitutionService.updateInstitution(req.params.id, req.body);
            if (!institution) {
                return res.status(404).json({ success: false, message: 'Kurum bulunamadı.' });
            }
            res.json({ success: true, data: institution });
        } catch (error) {
            next(error);
        }
    }

    async delete(req, res, next) {
        try {
            await InstitutionService.deleteInstitution(req.params.id);
            res.json({ success: true, message: 'Kurum silindi.' });
        } catch (error) {
            next(error);
        }
    }

    async getUsers(req, res, next) {
        try {
            const users = await InstitutionService.getInstitutionUsers(req.params.id);
            res.json({ success: true, data: users });
        } catch (error) {
            next(error);
        }
    }

    async updateUsers(req, res, next) {
        try {
            // req.body.userIds array'i bekliyoruz
            await InstitutionService.updateInstitutionUsers(req.params.id, req.body.userIds);
            res.json({ success: true, message: 'Kurum yetkilileri güncellendi.' });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new InstitutionController();
