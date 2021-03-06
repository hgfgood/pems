import React from 'react';
import { Table, message, Button, Divider, Modal, Form, Input } from 'antd';
import * as api from '../../api';
import './voltage.scss';

const kDefaultPageSize = 8;
const FormItem = Form.Item;

class VoltageForm extends React.Component {
  submitForm = callback => {
    this.props.form.validateFields((error, values) => {
      if (error) {
        return;
      }

      callback(values);
    });
  };

  clearForm = () => {
    this.props.form.resetFields();
  };

  render() {
    const { form } = this.props;
    const { getFieldDecorator } = form;
    const editVoltage = this.props.editVoltage || {};

    const formItemLayout = {
      labelCol: {
        xs: { span: 24 },
        sm: { span: 5 },
      },
      wrapperCol: {
        xs: { span: 24 },
        sm: { span: 15 },
      },
    };

    return (
      <Form {...formItemLayout}>
        <FormItem label="调度号:">
          {getFieldDecorator('number', {
            rules: [{ required: true, message: '请输入调度号' }],
            initialValue: editVoltage.number || '',
          })(<Input />)}
        </FormItem>
        <FormItem label="供电范围:">
          {getFieldDecorator('range', { initialValue: editVoltage.range })(<Input />)}
        </FormItem>
        <FormItem label="设备型号:">
          {getFieldDecorator('model', { initialValue: editVoltage.model })(<Input />)}
        </FormItem>
      </Form>
    );
  }
}
const VolForm = Form.create({})(VoltageForm);

class Voltage extends React.Component {
  volForm;

  state = {
    data: [],
    pagination: {},
    loading: false,
    showModal: false,
    curVoltage: null,
  };

  componentDidMount() {
    this.fetchVoltageList({ page_size: kDefaultPageSize, page_index: 1 });
  }

  fetchVoltageList = (params = {}) => {
    const { substation, transbox } = this.props;
    if (substation) {
      params.subId = substation._id;
    }
    if (transbox) {
      params.transId = transbox._id;
    }
    this.setState({ loading: true });
    api.voltage.getList({ params }).then(res => {
      const data = res.data.data;
      const { pagination } = this.state;
      pagination.total = data.count;
      pagination.pageSize = kDefaultPageSize;
      this.setState({
        loading: false,
        data: data.voltages,
        pagination,
      });
    });
  };

  handleCreateClick = () => {
    this.setState({ showModal: true });
  };

  handleTableChange = pagination => {
    const pager = { ...this.state.pagination };
    pager.current = pagination.current;
    this.setState({
      pagination: pager,
    });

    const params = { page_size: kDefaultPageSize, page_index: pager.current };
    this.fetchVoltageList(params);
  };

  handleEditClick = record => {
    this.setState({ curVoltage: record, showModal: true });
  };

  handleDeleteClick = record => {
    Modal.confirm({
      title: '注意',
      content: '你确定要删除这个设备吗',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        const hide = message.loading('正在删除', 0);
        api.voltage.delete({ data: { id: record._id } }).then(
          () => {
            hide();
            message.success('删除成功');
            const pager = { ...this.state.pagination };
            pager.current = 1;
            this.setState({
              pagination: pager,
            });

            const params = { page_size: kDefaultPageSize, page_index: 1 };
            this.fetchVoltageList(params);
          },
          err => {
            hide();
            message.error(err.data.message);
          },
        );
      },
    });
  };

  handleModalSubmit = () => {
    const { substation, transbox } = this.props;
    const { curVoltage } = this.state;
    const isAdd = !curVoltage;
    const msg = isAdd ? '正在添加设备' : '正在更新设备';
    this.volForm.submitForm(values => {
      const hide = message.loading(msg, 0);
      if (isAdd) {
        let data;
        if (substation) {
          data = { subId: substation._id, ...values };
        }
        if (transbox) {
          data = { transId: transbox._id, ...values };
        }

        api.voltage.create({ data }).then(
          () => {
            hide();
            message.success('添加成功');
            this.fetchVoltageList({ page_size: kDefaultPageSize, page_index: 1 });
            this.hideModalAndClear();
          },
          err => {
            hide();
            message.error(err.data.message);
          },
        );
      } else {
        api.voltage.update({ data: { _id: curVoltage._id, ...values } }).then(
          () => {
            hide();
            message.success('更新成功');
            this.fetchVoltageList({ page_size: kDefaultPageSize, page_index: 1 });
            this.hideModalAndClear();
          },
          err => {
            hide();
            message.error(err.data.message);
          },
        );
      }
    });
  };

  handleModalCancel = () => {
    this.hideModalAndClear();
  };

  hideModalAndClear() {
    this.setState({ curVoltage: null, showModal: false });
    this.volForm.clearForm();
  }

  render() {
    const { data, pagination, loading, showModal, curVoltage } = this.state;
    const isAdd = !curVoltage;
    const title = isAdd ? '添加设备' : '编辑设备';

    const columns = [
      {
        title: '调度号',
        dataIndex: 'number',
        width: '25%',
      },
      {
        title: '供电范围',
        dataIndex: 'range',
        width: '25%',
      },
      {
        title: '设备型号',
        dataIndex: 'model',
        width: '25%',
      },
      {
        title: '操作',
        key: 'action',
        render: record => (
          <div className="action-area">
            <Button
              className="action-button"
              type="link"
              onClick={this.handleEditClick.bind(this, record)}
            >
              编辑
            </Button>
            <Divider type="vertical" />
            <Button
              className="action-button"
              type="link"
              onClick={this.handleDeleteClick.bind(this, record)}
            >
              删除
            </Button>
          </div>
        ),
      },
    ];

    return (
      <div className="voltage-content">
        <div className="oper-area">
          <Button type="primary" onClick={this.handleCreateClick}>
            新增
          </Button>
          <Modal
            title={title}
            visible={showModal}
            onOk={this.handleModalSubmit}
            onCancel={this.handleModalCancel}
            okText="提交"
            cancelText="取消"
          >
            <VolForm
              editVoltage={curVoltage}
              wrappedComponentRef={ref => {
                this.volForm = ref;
              }}
            />
          </Modal>
        </div>
        <Table
          columns={columns}
          rowKey={record => record._id}
          dataSource={data}
          pagination={pagination}
          loading={loading}
          onChange={this.handleTableChange}
        />
      </div>
    );
  }
}

export default Voltage;
