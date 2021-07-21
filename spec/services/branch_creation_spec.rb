RSpec.describe BranchCreation, type: :model do
  subject(:branch_creation) do
    described_class.new(attributes)
  end
  let(:metadata) { metadata_fixture(:branching) }

  describe '#branch_uuid' do
    let(:uuid) { SecureRandom.uuid }
    let(:new_flow_branch_generator) { double(uuid: uuid) }
    before do
      allow(NewFlowBranchGenerator).to receive(:new).and_return(new_flow_branch_generator)
    end
    let(:attributes) { {} }

    it 'should return the uuid of the new flow branch object' do
      expect(branch_creation.branch_uuid).to eq(uuid)
    end
  end

  describe '#metadata' do
    let(:previous_flow_object) do
      metadata['pages'].find { |page| page['url'] == 'favourite-fruit' }
    end
    let(:conditionals_attributes) do
      {
        '0' => {
          'page' => 'some-page-uuid',
          'expressions_attributes' => {
            '0' => {
              'operator' => 'is',
              'question' => 'some-component-uuid',
              'field' => 'some-field-uuid'
            }
          }
        }
      }
    end
    let(:params) do
      {
        branch: {
          flow_uuid: previous_flow_object['_uuid'],
          conditionals_attributes: conditionals_attributes
        }
      }
    end
    let(:attributes) do
      {
        service_id: metadata['service_id'],
        latest_metadata: metadata,
        previous_flow_uuid: params[:branch][:flow_uuid],
        conditionals: params[:branch][:conditionals_attributes]
      }
    end

    context 'when metadata is valid' do
      it 'updates the service flow with the correct metadata' do
        flow_object = branch_creation.metadata['flow'][branch_creation.branch_uuid]
        expect(flow_object['next']['conditionals']).to eq(conditionals_attributes)
      end
    end
  end
end
