import { useState, useMemo, useCallback } from 'react';
import { Button, Col, Form, DatePicker, Popconfirm, InputNumber, message, Radio, Row, Select, Table } from 'antd';
import { withSession, PageLayout } from 'components';
import { dateRenderer, idFromArrayRenderer, tagsRenderer } from 'components/Table';
import withCourseData from 'components/withCourseData';
import { CourseService, CourseTask } from 'services/course';
import { formatTimezoneToUTC } from 'services/formatter';
import { CoursePageProps } from 'services/models';
import { Stage, StageService } from 'services/stage';
import { Task, TaskService } from 'services/task';
import { UserSearch } from 'components/UserSearch';
import { UserService } from 'services/user';
import { DEFAULT_TIMEZONE, TIMEZONES } from '../../../configs/timezones';
import moment from 'moment-timezone';
import { useAsync } from 'react-use';
import { ModalForm } from 'components/Forms';

type Props = CoursePageProps;

function Page(props: Props) {
  const courseId = props.course.id;
  const userService = new UserService();
  const service = useMemo(() => new CourseService(courseId), [courseId]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([] as CourseTask[]);
  const [stages, setStages] = useState([] as Stage[]);
  const [tasks, setTasks] = useState([] as Task[]);
  const [modalData, setModalData] = useState(null as Partial<CourseTask> | null);
  const [modalAction, setModalAction] = useState('update');

  useAsync(async () => {
    setLoading(true);
    const [data, stages, tasks] = await Promise.all([
      service.getCourseTasks(),
      new StageService().getCourseStages(courseId),
      new TaskService().getTasks(),
    ]);
    setData(data);
    setStages(stages);
    setTasks(tasks);
    setLoading(false);
  }, [courseId]);

  const handleAddItem = () => {
    setModalData({});
    setModalAction('create');
  };

  const handleEditItem = (record: CourseTask) => {
    setModalData(record);
    setModalAction('update');
  };

  const handleDeleteItem = async (id: number) => {
    try {
      await service.deleteCourseTask(id);
      const data = await service.getCourseTasks();
      setData(data);
    } catch {
      message.error('Failed to delete item. Please try later.');
    }
  };

  const loadUsers = async (searchText: string) => {
    return userService.searchUser(searchText);
  };

  const handleModalSubmit = async (values: any) => {
    const record = createRecord(values);
    let courseTask: CourseTask & { taskOwnerId?: number };
    let updatedData;

    if (modalAction === 'update') {
      courseTask = await service.updateCourseTask(modalData!.id!, record);
      courseTask.taskOwnerId = values.taskOwnerId;
      updatedData = data.map(d => (d.id === courseTask.id ? { ...d, ...courseTask } : d));
    } else {
      courseTask = await service.createCourseTask(record);
      updatedData = data.concat([courseTask]);
    }

    setData(updatedData);
    setModalData(null);
  };

  const handleDistribute = async (record: CourseTask) => {
    setLoading(true);
    await service.createInterviewDistribution(record.id);
    setLoading(false);
  };

  const filterOption = useCallback(
    (input, option) => {
      if (!input) {
        return false;
      }
      const task = tasks.find(t => t.id === option?.value);
      return task?.name.toLowerCase().includes(input.toLowerCase()) ?? false;
    },
    [tasks],
  );

  const renderModal = (modalData: Partial<CourseTask>) => {
    if (modalData == null) {
      return null;
    }
    return (
      <ModalForm
        getInitialValues={getInitialValues}
        data={modalData}
        title="Course Task"
        submit={handleModalSubmit}
        cancel={() => {
          setModalData(null);
        }}
      >
        <Form.Item name="taskId" label="Task" rules={[{ required: true, message: 'Please select a task' }]}>
          <Select filterOption={filterOption} showSearch placeholder="Please select a task">
            {tasks.map((task: Task) => (
              <Select.Option key={task.id} value={task.id}>
                {task.name} {tagsRenderer(task.tags)}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item name="stageId" label="Stage" rules={[{ required: true, message: 'Please select a stage' }]}>
          <Select placeholder="Please select a stage">
            {stages.map((stage: Stage) => (
              <Select.Option key={stage.id} value={stage.id}>
                {stage.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item
          name="taskOwnerId"
          label="Task Owner"
          rules={[{ required: false, message: 'Please select a task owner' }]}
        >
          <UserSearch defaultValues={modalData.taskOwner ? [modalData.taskOwner] : []} searchFn={loadUsers} />
        </Form.Item>
        <Form.Item name="timeZone" label="TimeZone">
          <Select placeholder="Please select a timezone">
            {Object.entries(TIMEZONES).map(tz => (
              <Select.Option key={tz[0]} value={tz[0]}>
                {tz[0]}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item
          name="range"
          label="Start Date - End Date"
          rules={[{ required: true, type: 'array', message: 'Please enter start and end date' }]}
        >
          <DatePicker.RangePicker format="YYYY-MM-DD HH:mm" showTime={{ format: 'HH:mm' }} />
        </Form.Item>
        <Row gutter={24}>
          <Col span={12}>
            <Form.Item name="maxScore" label="Score" rules={[{ required: true, message: 'Please enter max score' }]}>
              <InputNumber step={1} min={0} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="scoreWeight"
              label="Score Weight"
              rules={[{ required: true, message: 'Please enter score weight' }]}
            >
              <InputNumber step={0.1} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="checker" label="Who Checks">
          <Radio.Group>
            <Radio value="mentor">Mentor</Radio>
            <Radio value="assigned">Assigned</Radio>
            <Radio value="taskOwner">Task Owner</Radio>
            <Radio value="crossCheck">Cross-Check</Radio>
            <Radio value="jury">Jury</Radio>
          </Radio.Group>
        </Form.Item>
      </ModalForm>
    );
  };

  return (
    <PageLayout loading={loading} githubId={props.session.githubId}>
      <Button type="primary" onClick={handleAddItem}>
        Add Task
      </Button>
      <Table
        rowKey="id"
        pagination={{ pageSize: 100 }}
        size="small"
        dataSource={data}
        columns={getColumns({ handleEditItem, handleDeleteItem, handleDistribute }, { tasks, stages })}
      />
      {renderModal(modalData!)}
    </PageLayout>
  );
}

function getColumns(
  actions: { handleEditItem: any; handleDeleteItem: any; handleDistribute: any },
  { tasks, stages }: { tasks: any[]; stages: any[] },
) {
  return [
    { title: 'Id', dataIndex: 'id' },
    {
      title: 'Name',
      dataIndex: 'taskId',
      render: idFromArrayRenderer(tasks),
    },
    { title: 'Scores Count', dataIndex: 'taskResultCount' },
    { title: 'Start Date', dataIndex: 'studentStartDate', render: dateRenderer },
    { title: 'End Date', dataIndex: 'studentEndDate', render: dateRenderer },
    { title: 'Max Score', dataIndex: 'maxScore' },
    {
      title: 'Stage',
      dataIndex: 'stageId',
      render: idFromArrayRenderer(stages),
    },
    { title: 'Score Weight', dataIndex: 'scoreWeight' },
    { title: 'Who Checks', dataIndex: 'checker' },
    { title: 'Task Owner', dataIndex: ['taskOwner', 'githubId'] },
    {
      title: 'Actions',
      dataIndex: 'actions',
      render: (_: any, record: CourseTask) => (
        <>
          <span>
            <a onClick={() => actions.handleEditItem(record)}>Edit</a>{' '}
          </span>
          <span>
            <Popconfirm
              onConfirm={() => actions.handleDeleteItem(record.id)}
              title="Are you sure you want to delete this item?"
            >
              <a href="#">Delete</a>
            </Popconfirm>
          </span>{' '}
          {(record.type === 'interview' || record.checker === 'assigned') && (
            <span>
              <a onClick={() => actions.handleDistribute(record)}>Distribute</a>{' '}
            </span>
          )}
        </>
      ),
    },
  ];
}

function createRecord(values: any) {
  const [startDate, endDate] = values.range || [null, null];
  const data = {
    studentStartDate: startDate ? formatTimezoneToUTC(startDate, values.timeZone) : null,
    studentEndDate: endDate ? formatTimezoneToUTC(endDate, values.timeZone) : null,
    taskId: values.taskId,
    stageId: values.stageId,
    taskOwnerId: values.taskOwnerId,
    checker: values.checker,
    scoreWeight: values.scoreWeight,
    maxScore: values.maxScore,
  };
  return data;
}

function getInitialValues(modalData: Partial<CourseTask>) {
  return {
    ...modalData,
    taskOwnerId: modalData.taskOwner ? modalData.taskOwner.id : undefined,
    timeZone: DEFAULT_TIMEZONE,
    maxScore: modalData.maxScore || 100,
    scoreWeight: modalData.scoreWeight || 1,
    range:
      modalData.studentStartDate && modalData.studentEndDate
        ? [
            modalData.studentStartDate ? moment.tz(modalData.studentStartDate, DEFAULT_TIMEZONE) : null,
            modalData.studentEndDate ? moment.tz(modalData.studentEndDate, DEFAULT_TIMEZONE) : null,
          ]
        : null,
    checker: modalData.checker || 'mentor',
  };
}

export default withCourseData(withSession(Page));
