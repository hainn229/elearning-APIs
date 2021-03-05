const express = require('express');
const router = express.Router();
const joi = require('joi');
const {
    getCoursesWithPages,
    getCourses,
    addCourse,
    detailsCourse,
    updateCourse,
    deleteCourse,
    findCourseByTitle
} = require('../services/courses');

router.get('/', async (req, res) => {
    try {
        const currentPage = parseInt(req.query.currentPage) || 1;
        const limitPage = parseInt(req.query.limitPage) || 5;
        const keywords = req.query.keywords || '';
        const tutor = req.query.tutor || [];
        const category = req.query.category || [];
        const courses = await getCoursesWithPages(currentPage, limitPage, keywords, tutor, category);
        return res.status(200).json({
            courses: courses
        });
    } catch (err) {
        return res.status(500).json({
            message: err.message
        });
    };
});

router.get('/all', async (req, res) => {
    try {
        const courses = await getCourses();
        return res.status(200).json({
            courses: courses
        })
    } catch (err) {
        return res.status(500).json({
            message: err.message
        });
    };
});

router.post('/add', async (req, res) => {
    try {
        const dataInput = joi.object({
            course_title: joi.string().pattern(RegExp('^[A-Za-z0-9]*$')).required(),
            price: joi.number().required(),
            tutor_id: joi.string().required(),
            cat_id: joi.string().required(),
            description: joi.string()
        });

        const newData = await dataInput.validate(req.body);
        if (newData.err) {
            return res.status(400).json({
                message: 'Please enter a valid course title!'
            });
        }

        const course = await findCourseByTitle(req.body.course_title);
        if (course) {
            return res.status(200).json({
                message: 'The course title is already exist!'
            });
        }
        await addCourse(newData.value);
        return res.status(200).json({
            message: 'New course have been created successfully!'
        });
    } catch (err) {
        return res.status(500).json({
            message: err.message
        });
    };
});

router.get('/:id', async (req, res) => {
    try {
        const course = await detailsCourse(req.params.id);
        return res.status(200).json({
            course: course
        });
    } catch (err) {
        return res.status(500).json({
            message: err.message
        });
    };
});

// router.put('/:id', async (req, res) => {
//     try {
//         const dataInput = joi.object({
//             course_title: joi.string().pattern(RegExp('^[A-Za-z0-9]*$')).required(),
//             price: joi.number().required(),
//             tutor_id: joi.string().required(),
//             cat_id: joi.string().required(),
//             description: joi.string()
//         });

//         const updateData = await dataInput.validate(req.body);

//         if (updateData.err) {
//             return res.status(400).json({
//                 message: 'Please enter a valid course title!'
//             })
//         }

//         const course = await findCourseByTitle(req.body.course_title);
//         if (course) {
//             return res.status(200).json({
//                 message: 'The course title is already exist!'
//             });
//         }

//         await updateCourse(req.params.id, updateData.value);
//         return res.status(200).json({
//             message: 'The course have been updated successfully!'
//         });
//     } catch (err) {
//         return res.status(500).json({
//             message: err.message
//         });
//     };
// });

router.delete('/:id', async (req, res) => {
    try {
        await deleteCourse(req.params.id);
        return res.status(200).json({
            message: 'Delete category successfully!'
        });
    } catch (err) {
        return res.status(500).json({
            message: err.message
        });
    };
});

module.exports = router;